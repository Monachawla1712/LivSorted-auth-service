export class AudienceRules {
  queryType: string;
  query: string;
  params: AudienceParams;
  entityType: string;
  audienceTag: string;
}

export class AudienceParams {
  orderLowerLimit: number;
  orderUpperLimit: number;
}
