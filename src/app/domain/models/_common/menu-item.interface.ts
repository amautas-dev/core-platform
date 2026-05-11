export interface MenuItem {
  id: number;
  label: string;
  icon: string;
  path: string;
  order: number;
  children?: MenuItem[];
}
