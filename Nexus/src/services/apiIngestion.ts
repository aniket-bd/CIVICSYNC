import { DataSourceConfig, IngestionReport } from '../types/ingestion';
import { Project, ProjectType } from '../types/project';
import { store } from '../db/store';

export class ApiIngestionService {
  /**
   * Fetch and normalize records from an external configured data source
   */
  public static async fetchFromDataSource(source: DataSourceConfig): Promise<IngestionReport> {
    // Simulated realistic API fetch with dynamic schema mapping
    await new Promise(r => setTimeout(r, 600));

    // Mock external response matching typical municipal e-tender format
    const mockApiResponse: Record<string, unknown>[] = [
      {
        tender_id: `MHA/PWD/2026/${Math.floor(100 + Math.random() * 900)}`,
        work_name: 'Civil Lines Underground Stormwater Drain & Junction Sump',
        dept_name: 'Public Works Department',
        est_cost_inr: 48000000,
        category: 'Drainage',
        commence_date: '2026-10-15',
        completion_date: '2027-02-28',
        excavation_depth_m: 3.5,
        lat: 21.1525,
        lng: 79.0710
      },
      {
        tender_id: `NMRCL/GAS/2026/${Math.floor(100 + Math.random() * 900)}`,
        work_name: 'Dharampeth City Gas Distribution Intermediate Steel Mains',
        dept_name: 'City Gas Network SPV',
        est_cost_inr: 31000000,
        category: 'Telecom',
        commence_date: '2026-09-25',
        completion_date: '2026-12-20',
        excavation_depth_m: 1.8,
        lat: 21.1430,
        lng: 79.0640
      }
    ];

    const previewItems = mockApiResponse.map((row, idx) => {
      const project: Partial<Project> = {
        id: 'proj-api-' + Date.now() + '-' + idx,
        name: String(row.work_name || 'API Ingested Project'),
        tenderNumber: String(row.tender_id),
        description: `Imported via API endpoint ${source.name}. Configured field-mapping applied.`,
        type: (row.category as ProjectType) || 'Other',
        budget: Number(row.est_cost_inr) || 25000000,
        approvedAmount: Number(row.est_cost_inr) || 25000000,
        estimatedAmount: (Number(row.est_cost_inr) || 25000000) * 1.05,
        potentialSaving: (Number(row.est_cost_inr) || 25000000) * 0.08,
        startDate: String(row.commence_date),
        expectedCompletionDate: String(row.completion_date),
        durationDays: 90,
        status: 'Approved',
        contractor: 'Selected Via API E-Bidding',
        department: String(row.dept_name),
        authority: 'Nagpur Municipal Corporation',
        managedBy: 'CivicSync',
        locationName: 'Nagpur Municipal Zone',
        wardOrRegion: 'Dharampeth Zone 2',
        latitude: Number(row.lat) || 21.144,
        longitude: Number(row.lng) || 79.063,
        depthMeters: Number(row.excavation_depth_m) || 2.5,
        lengthMeters: 1600,
        widthMeters: 2.0,
        documents: [],
        source: `API: ${source.name}`,
        sourceUrl: source.url,
        lastUpdated: new Date().toISOString().split('T')[0],
        confidence: 'Verified Data',
        riskScore: 50,
        collaborationPotential: 'High'
      };

      const isDuplicate = store.getProjects().some(p => p.tenderNumber === project.tenderNumber);

      return {
        index: idx + 1,
        rawRecord: row,
        parsedProject: project,
        isValid: true,
        isDuplicate,
        missingFields: [],
        issues: isDuplicate ? [{ field: 'tenderNumber', message: 'Tender ID exists in database.', severity: 'warning' as const }] : [],
        selectedForImport: !isDuplicate
      };
    });

    return {
      sourceType: 'API',
      sourceName: source.name,
      totalRecords: previewItems.length,
      validRecordsCount: previewItems.filter(p => p.isValid && !p.isDuplicate).length,
      missingFieldsCount: 0,
      invalidRecordsCount: 0,
      duplicateRecordsCount: previewItems.filter(p => p.isDuplicate).length,
      previewItems
    };
  }
}
