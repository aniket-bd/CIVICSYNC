import { Project, ProjectType } from '../types/project';
import { WorkSequenceFilter, WorkSequenceMatch, WorkSequenceResult, CollaborationClassification } from '../types/workSequence';
import { calculateGeometryDistanceMeters, calculateDateOverlapDays } from '../db/spatialUtils';

export class WorkSequenceEngine {
  /**
   * Deterministic Matching & Scoring Engine
   */
  public static evaluateWorkSequence(
    primaryProject: Project,
    candidateProjects: Project[],
    filter: WorkSequenceFilter
  ): WorkSequenceResult {
    const recommendations: WorkSequenceMatch[] = [];
    let conflictCount = 0;
    let totalPotentialSavings = 0;

    for (const candidate of candidateProjects) {
      if (candidate.id === primaryProject.id) continue;

      // Filter by status if specified
      if (filter.allowedStatuses.length > 0 && !filter.allowedStatuses.includes(candidate.status)) {
        continue;
      }

      // Filter by type if specified
      if (filter.selectedTypes.length > 0 && !filter.selectedTypes.includes(candidate.type)) {
        continue;
      }

      // Calculate spatial distance
      const distanceMeters = calculateGeometryDistanceMeters(
        primaryProject.routeGeometry || { lat: primaryProject.latitude, lng: primaryProject.longitude },
        candidate.routeGeometry || { lat: candidate.latitude, lng: candidate.longitude }
      );

      if (distanceMeters > filter.maxDistanceMeters) {
        continue;
      }

      // Calculate date overlap in days
      const dateOverlapDays = calculateDateOverlapDays(
        primaryProject.startDate,
        primaryProject.expectedCompletionDate,
        candidate.startDate,
        candidate.expectedCompletionDate
      );

      // Depth difference in meters
      const primaryDepth = primaryProject.depthMeters ?? 2.5;
      const candidateDepth = candidate.depthMeters ?? 2.5;
      const depthDiffMeters = Math.abs(primaryDepth - candidateDepth);

      if (candidateDepth < filter.minDepth || candidateDepth > filter.maxDepth) {
        continue;
      }

      // --- Deterministic Multi-Factor Scoring (0 to 100) ---
      // 1. Spatial Score (decay with distance: 100 at 0m, 50 at 250m, 0 at 1000m)
      const spatialScore = Math.max(0, Math.round(100 * Math.exp(-distanceMeters / 300)));

      // 2. Timeline Score (100 if >30 days overlap, 60 if within 30 days gap, 20 if within 90 days)
      let timelineScore = 0;
      if (dateOverlapDays > 0) {
        timelineScore = Math.min(100, 50 + Math.round((dateOverlapDays / 60) * 50));
      } else {
        const startGapDays = Math.abs(
          (new Date(primaryProject.startDate).getTime() - new Date(candidate.startDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        timelineScore = Math.max(0, Math.round(60 * Math.exp(-startGapDays / 60)));
      }

      // 3. Depth Score (Higher if depths allow layered sequencing or trench sharing)
      // If depth difference is moderate (e.g. 1.0m to 4.0m), ideal for deep pipe + shallow duct benching
      let depthScore = 70;
      if (depthDiffMeters > 0.3 && depthDiffMeters <= 4.0) {
        depthScore = 95; // perfect for layered co-location
      } else if (depthDiffMeters <= 0.3) {
        depthScore = 50; // physical clash risk! needs engineering review
      } else {
        depthScore = 60;
      }

      // 4. Infrastructure Compatibility & Sequencing Rules
      const { compatibilityScore, reasons, isPhysicalConflict, delayReductionDays, savingsINR } = 
        this.evaluateCompatibility(primaryProject, candidate, distanceMeters, dateOverlapDays, depthDiffMeters);

      // Weighted Composite Score
      // 35% Spatial, 25% Timeline, 15% Depth, 25% Compatibility
      const compositeScore = Math.round(
        (spatialScore * 0.35) +
        (timelineScore * 0.25) +
        (depthScore * 0.15) +
        (compatibilityScore * 0.25)
      );

      // Classification
      let classification: CollaborationClassification = 'Low relevance';
      if (isPhysicalConflict) {
        classification = 'Needs engineering review';
        conflictCount++;
      } else if (compositeScore >= 65) {
        classification = 'Potential collaboration';
      } else if (compositeScore >= 45) {
        classification = 'Needs engineering review';
      }

      // Percentage metrics
      const mustTryScorePercent = Math.min(98, Math.max(12, compositeScore + (isPhysicalConflict ? -15 : 10)));
      const skipScorePercent = Math.max(2, 100 - mustTryScorePercent);
      const riskScorePercent = isPhysicalConflict ? 85 : Math.max(10, Math.round(100 - compositeScore * 0.8));
      const profitSavingOpportunityPercent = Math.min(95, Math.round((savingsINR / Math.min(primaryProject.budget, candidate.budget)) * 500));

      totalPotentialSavings += savingsINR;

      recommendations.push({
        candidateProject: candidate,
        distanceMeters,
        dateOverlapDays,
        depthDifferenceMeters: depthDiffMeters,
        spatialScore,
        timelineScore,
        depthScore,
        compatibilityScore,
        compositeScore,
        estimatedSavingINR: savingsINR,
        estimatedDelayImpactDays: delayReductionDays,
        riskScorePercent,
        profitSavingOpportunityPercent,
        mustTryScorePercent,
        skipScorePercent,
        classification,
        explanationReasons: reasons,
        engineeringNotes: isPhysicalConflict 
          ? `WARNING: Depth collision warning (${depthDiffMeters.toFixed(1)}m vertical separation at ${distanceMeters}m corridor proximity). Joint coordination mandatory.` 
          : `High sequence synergy: synchronize contractor mobilization to prevent repeat road excavation.`
      });
    }

    // Sort by composite score descending
    recommendations.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign rank 1, 2, 3...
    recommendations.forEach((rec, idx) => {
      rec.rank = idx + 1;
    });

    const limited = recommendations.slice(0, filter.limitCount || 10);

    return {
      primaryProject,
      recommendations: limited,
      conflictCount,
      totalPotentialSavingsINR: totalPotentialSavings,
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Deterministic Municipal Infrastructure Compatibility Rules
   */
  private static evaluateCompatibility(
    p1: Project,
    p2: Project,
    distanceMeters: number,
    dateOverlapDays: number,
    depthDiffMeters: number
  ): {
    compatibilityScore: number;
    reasons: string[];
    isPhysicalConflict: boolean;
    delayReductionDays: number;
    savingsINR: number;
  } {
    const reasons: string[] = [];
    let compatibilityScore = 60;
    let isPhysicalConflict = false;
    let delayReductionDays = 14;
    let savingsINR = 800000;

    // Rule 1: Corridor alignment
    if (distanceMeters <= 50) {
      reasons.push(`Same primary municipal construction corridor (${distanceMeters}m spatial offset).`);
      compatibilityScore += 15;
    } else if (distanceMeters <= 200) {
      reasons.push(`Adjacent right-of-way zone (${distanceMeters}m separation).`);
      compatibilityScore += 5;
    }

    // Rule 2: Timeline overlap
    if (dateOverlapDays > 20) {
      reasons.push(`Overlapping construction schedules (${dateOverlapDays} days concurrent window).`);
      compatibilityScore += 15;
    } else if (dateOverlapDays > 0) {
      reasons.push(`Synchronized construction window (${dateOverlapDays} days overlap).`);
      compatibilityScore += 10;
    }

    // Rule 3: Water Pipe + Road Resurfacing (The classic municipal uncoordinated digging problem!)
    if (
      (p1.type === 'Water' && p2.type === 'Road') ||
      (p1.type === 'Road' && p2.type === 'Water')
    ) {
      reasons.push('Compatible infrastructure sequence: Complete deep water pipeline excavation prior to final bitumen asphalt overlay.');
      reasons.push('Potential reduction in repeated road cutting: Eliminates post-paving trench cuts and saves resurfacing rework.');
      compatibilityScore += 25;
      savingsINR = Math.round(Math.min(p1.budget, p2.budget) * 0.08); // 8% of budget
      delayReductionDays = 28;
    }

    // Rule 4: Water Pipe + Telecom / Cable Duct
    else if (
      (p1.type === 'Water' && (p2.type === 'Telecom' || p2.type === 'Cable')) ||
      ((p1.type === 'Telecom' || p1.type === 'Cable') && p2.type === 'Water')
    ) {
      reasons.push('Potential shared utility corridor: Telecom micro-ducts can be installed in upper trench bench (1.5m) above deep water mains (5.0m).');
      reasons.push('Potential shared excavation: Single mobilization of hydraulic excavators.');
      compatibilityScore += 20;
      savingsINR = Math.round(Math.min(p1.budget, p2.budget) * 0.06);
      delayReductionDays = 18;
    }

    // Rule 5: Road + Telecom / Electrical
    else if (
      (p1.type === 'Road' && (p2.type === 'Telecom' || p2.type === 'Electrical' || p2.type === 'Cable')) ||
      ((p1.type === 'Telecom' || p1.type === 'Electrical' || p1.type === 'Cable') && p2.type === 'Road')
    ) {
      reasons.push('Pre-paving utility conduit placement: Lay underground crossing sleeves before asphalt base compaction.');
      compatibilityScore += 20;
      savingsINR = Math.round(Math.min(p1.budget, p2.budget) * 0.05);
      delayReductionDays = 15;
    }

    // Rule 6: Drainage Box Culvert + Sewer Trunk Line (Deep excavation conflict check!)
    else if (
      (p1.type === 'Drainage' && p2.type === 'Sewerage') ||
      (p1.type === 'Sewerage' && p2.type === 'Drainage')
    ) {
      if (distanceMeters < 30 && depthDiffMeters < 1.0) {
        isPhysicalConflict = true;
        reasons.push('CRITICAL DEPTH CONFLICT: Storm culvert and sewer trunk line cross at similar invert elevations (<1.0m difference).');
        reasons.push('Engineering review required for siphon or inverted junction design.');
        compatibilityScore = 40;
        savingsINR = 2000000;
        delayReductionDays = 35;
      } else {
        reasons.push('Coordinated deep dewatering & sheet piling sequence.');
        compatibilityScore += 10;
      }
    }

    // Default fallback reason if list is short
    if (reasons.length < 2) {
      reasons.push('Compatible municipal engineering work in proximal municipal ward.');
    }

    return {
      compatibilityScore: Math.min(100, compatibilityScore),
      reasons,
      isPhysicalConflict,
      delayReductionDays,
      savingsINR
    };
  }
}
