/** Mercado desde GET /api/v1/platform/countries */
export interface CountryMarket {
  readonly countryCode: string;
  readonly name: string;
  readonly defaultCurrency: string;
  readonly sortOrder: number;
}
