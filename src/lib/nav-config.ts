import type { UserRole } from "@/types/database.types";
import {
  LayoutDashboard,
  Shirt,
  Boxes,
  ShoppingCart,
  Truck,
  Users,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  roles?: UserRole[];
  children?: { label: string; href: string; roles?: UserRole[] }[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Products",
    href: "/products",
    icon: Shirt,
    children: [
      { label: "All Products", href: "/products" },
      { label: "Categories", href: "/products/categories" },
      { label: "Collections", href: "/products/collections" },
      { label: "Costing", href: "/products/costing", roles: ["admin", "manager"] },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    children: [
      { label: "Stock Overview", href: "/inventory" },
      { label: "Stock In", href: "/inventory/stock-in", roles: ["admin", "manager"] },
      { label: "Stock Movements", href: "/inventory/movements" },
      { label: "Low Stock", href: "/inventory/low-stock" },
    ],
  },
  {
    label: "Sales",
    href: "/sales/pos",
    icon: ShoppingCart,
    children: [
      { label: "POS", href: "/sales/pos" },
      { label: "Orders", href: "/sales/orders" },
      { label: "Returns", href: "/sales/returns" },
    ],
  },
  {
    label: "Purchasing",
    href: "/purchasing/purchases",
    icon: Truck,
    roles: ["admin", "manager"],
    children: [
      { label: "Purchases", href: "/purchasing/purchases" },
      { label: "Suppliers", href: "/purchasing/suppliers" },
    ],
  },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Expenses", href: "/expenses", icon: Receipt, roles: ["admin", "manager"] },
  {
    label: "Reports",
    href: "/reports/sales",
    icon: BarChart3,
    children: [
      { label: "Sales", href: "/reports/sales" },
      { label: "Inventory", href: "/reports/inventory" },
      { label: "Profit & Loss", href: "/reports/profit-loss", roles: ["admin", "manager"] },
      { label: "Products", href: "/reports/products" },
    ],
  },
  { label: "Users", href: "/users", icon: UserCog, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

export function filterNavForRole(items: NavItem[], role: UserRole): NavItem[] {
  return items
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((c) => !c.roles || c.roles.includes(role)),
    }));
}
