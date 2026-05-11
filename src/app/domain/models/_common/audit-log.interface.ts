export interface AuditLog {
  id: number;
  ts: string; // fecha/hora
  user_id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip: string | null;
  data: any; // JSON con detalles
}
