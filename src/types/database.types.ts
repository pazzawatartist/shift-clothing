/**
 * Hand-authored to match supabase/migrations exactly. Once you have a live
 * Supabase project, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
 *
 * IMPORTANT: every Row/Insert/Update shape below is a `type` alias, never an
 * `interface`. TypeScript's structural "extends" check against an index
 * signature (which is how @supabase/postgrest-js validates `Database["public"]
 * ["Tables"][name] extends GenericTable`) only succeeds for plain object type
 * literals — a named `interface` fails that check even though it looks
 * identical, silently collapsing every table's Row/Insert/Update to `never`.
 * Composition below uses `&` intersections instead of `interface ... extends`
 * for the same reason.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "manager" | "staff";
export type UserStatus = "active" | "inactive";
export type EntityStatus = "active" | "inactive";
export type ProductStatus = "active" | "draft" | "archived";
export type VariantStatus = "active" | "inactive";
export type InventoryTxnType =
  | "stock_in"
  | "stock_out"
  | "sale"
  | "return"
  | "damage"
  | "adjustment"
  | "transfer";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type PaymentMethod = "cash" | "gcash" | "maya" | "bank_transfer" | "card" | "other";
export type PurchaseStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";
export type SalesChannel = "pos" | "online";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready"
  | "completed"
  | "cancelled"
  | "refunded";
export type DiscountType = "fixed" | "percentage";
export type ReturnReason =
  | "wrong_size"
  | "wrong_color"
  | "damaged"
  | "defective"
  | "change_of_mind"
  | "other";
export type ReturnStatus = "requested" | "approved" | "rejected" | "completed";
export type ReturnAction = "refund" | "exchange";
export type ExpenseCategory =
  | "rent"
  | "utilities"
  | "salaries"
  | "marketing"
  | "packaging"
  | "transportation"
  | "supplies"
  | "manufacturing"
  | "shipping"
  | "platform_fees"
  | "other";
export type NotificationType =
  | "low_stock"
  | "out_of_stock"
  | "new_order"
  | "pending_payment"
  | "return_request";

type Timestamped = {
  created_at: string;
  updated_at: string;
};

export type ProfileRow = Timestamped & {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
};
export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at" | "role" | "status"> &
  Partial<Pick<ProfileRow, "role" | "status" | "created_at" | "updated_at">>;
export type ProfileUpdate = Partial<ProfileInsert>;

type NamedEntity = Timestamped & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: EntityStatus;
};
export type CategoryRow = NamedEntity;
export type CategoryInsert = Partial<CategoryRow> & Pick<CategoryRow, "name" | "slug">;
export type CategoryUpdate = Partial<CategoryInsert>;

export type CollectionRow = NamedEntity & {
  season: string | null;
};
export type CollectionInsert = Partial<CollectionRow> & Pick<CollectionRow, "name" | "slug">;
export type CollectionUpdate = Partial<CollectionInsert>;

export type SupplierRow = Timestamped & {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: EntityStatus;
};
export type SupplierInsert = Partial<SupplierRow> & Pick<SupplierRow, "name">;
export type SupplierUpdate = Partial<SupplierInsert>;

export type CustomerRow = Timestamped & {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  birthday: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  last_purchase_at: string | null;
};
export type CustomerInsert = Partial<CustomerRow> & Pick<CustomerRow, "full_name">;
export type CustomerUpdate = Partial<CustomerInsert>;

export type ProductRow = Timestamped & {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  collection_id: string | null;
  supplier_id: string | null;
  brand: string | null;
  status: ProductStatus;
  cost_price: number;
  selling_price: number;
  discount_price: number | null;
  manufacturing_cost: number;
  packaging_cost: number;
  other_cost: number;
  created_by: string | null;
};
export type ProductInsert = Partial<ProductRow> & Pick<ProductRow, "sku" | "name" | "slug">;
export type ProductUpdate = Partial<ProductInsert>;

export type ProductImageRow = {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};
export type ProductImageInsert = Partial<ProductImageRow> & Pick<ProductImageRow, "product_id" | "url">;
export type ProductImageUpdate = Partial<ProductImageInsert>;

export type ProductVariantRow = Timestamped & {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  color: string;
  barcode: string | null;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  status: VariantStatus;
};
export type ProductVariantInsert = Partial<ProductVariantRow> &
  Pick<ProductVariantRow, "product_id" | "sku" | "size" | "color">;
export type ProductVariantUpdate = Partial<ProductVariantInsert>;

export type InventoryRow = {
  id: string;
  product_variant_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_damaged: number;
  quantity_returned: number;
  quantity_sold: number;
  reorder_level: number;
  updated_at: string;
};

export type InventoryTransactionRow = {
  id: string;
  product_variant_id: string;
  transaction_type: InventoryTxnType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type PurchaseRow = Timestamped & {
  id: string;
  purchase_number: string;
  supplier_id: string;
  reference_number: string | null;
  status: PurchaseStatus;
  payment_status: PaymentStatus;
  order_date: string;
  expected_date: string | null;
  received_at: string | null;
  subtotal: number;
  total_cost: number;
  notes: string | null;
  created_by: string | null;
};
export type PurchaseInsert = Partial<PurchaseRow> & Pick<PurchaseRow, "purchase_number" | "supplier_id">;
export type PurchaseUpdate = Partial<PurchaseInsert>;

export type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  product_variant_id: string;
  quantity: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
};
export type PurchaseItemInsert = Partial<PurchaseItemRow> &
  Pick<PurchaseItemRow, "purchase_id" | "product_variant_id" | "quantity" | "unit_cost" | "total_cost">;

export type PromoCodeRow = {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  ends_at: string | null;
  status: EntityStatus;
  created_at: string;
};
export type PromoCodeInsert = Partial<PromoCodeRow> & Pick<PromoCodeRow, "code" | "type" | "value">;
export type PromoCodeUpdate = Partial<PromoCodeInsert>;

export type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  sales_channel: SalesChannel;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  promo_code_id: string | null;
  discount_type: DiscountType | null;
  discount_value: number;
  discount_amount: number;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  shipping_address: string | null;
  shipping_notes: string | null;
  notes: string | null;
  inventory_deducted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_variant_id: string;
  product_name_snapshot: string;
  variant_label_snapshot: string;
  quantity: number;
  unit_price: number;
  unit_cost_snapshot: number;
  discount_amount: number;
  line_total: number;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  reference_number: string | null;
  paid_at: string;
  created_by: string | null;
  created_at: string;
};

export type OrderStatusHistoryRow = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type ReturnRow = Timestamped & {
  id: string;
  return_number: string;
  order_id: string;
  customer_id: string | null;
  reason: ReturnReason;
  status: ReturnStatus;
  refund_amount: number;
  notes: string | null;
  created_by: string | null;
  resolved_by: string | null;
};

export type ReturnItemRow = {
  id: string;
  return_id: string;
  order_item_id: string;
  product_variant_id: string;
  quantity: number;
  action: ReturnAction;
  exchange_variant_id: string | null;
  created_at: string;
};

export type ExpenseRow = Timestamped & {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  receipt_url: string | null;
  notes: string | null;
  created_by: string | null;
};
export type ExpenseInsert = Partial<ExpenseRow> & Pick<ExpenseRow, "category" | "description" | "amount">;
export type ExpenseUpdate = Partial<ExpenseInsert>;

export type NotificationRow = {
  id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type SettingsRow = {
  id: true;
  business_name: string;
  logo_url: string | null;
  address: string | null;
  contact_number: string | null;
  email: string | null;
  social_media: Json;
  currency: string;
  tax_percentage: number;
  low_stock_threshold: number;
  auto_deduct_on: OrderStatus;
  updated_by: string | null;
  updated_at: string;
};
export type SettingsUpdate = Partial<Omit<SettingsRow, "id">>;

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  record_id: string | null;
  details: Json | null;
  created_at: string;
};

// `Relationships` is deliberately empty: this hand-authored type doesn't model
// FK metadata, so PostgREST's embedded-resource select parsing (`table(cols)`)
// falls back to loosely-typed results. Regenerate with the Supabase CLI once a
// live project exists to get fully precise embed typing; until then, call
// sites that embed relations cast their result shape explicitly (see
// src/services/*.ts).
type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  // Required by @supabase/supabase-js >= 2.9x so its generics resolve the
  // schema/PostgREST feature flags correctly against a hand-authored type.
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, ProfileInsert, ProfileUpdate>;
      categories: TableDef<CategoryRow, CategoryInsert, CategoryUpdate>;
      collections: TableDef<CollectionRow, CollectionInsert, CollectionUpdate>;
      suppliers: TableDef<SupplierRow, SupplierInsert, SupplierUpdate>;
      customers: TableDef<CustomerRow, CustomerInsert, CustomerUpdate>;
      products: TableDef<ProductRow, ProductInsert, ProductUpdate>;
      product_images: TableDef<ProductImageRow, ProductImageInsert, ProductImageUpdate>;
      product_variants: TableDef<ProductVariantRow, ProductVariantInsert, ProductVariantUpdate>;
      inventory: TableDef<InventoryRow>;
      inventory_transactions: TableDef<InventoryTransactionRow>;
      purchases: TableDef<PurchaseRow, PurchaseInsert, PurchaseUpdate>;
      purchase_items: TableDef<PurchaseItemRow, PurchaseItemInsert>;
      promo_codes: TableDef<PromoCodeRow, PromoCodeInsert, PromoCodeUpdate>;
      orders: TableDef<OrderRow>;
      order_items: TableDef<OrderItemRow>;
      payments: TableDef<PaymentRow>;
      order_status_history: TableDef<OrderStatusHistoryRow>;
      returns: TableDef<ReturnRow>;
      return_items: TableDef<ReturnItemRow>;
      expenses: TableDef<ExpenseRow, ExpenseInsert, ExpenseUpdate>;
      notifications: TableDef<NotificationRow>;
      settings: TableDef<SettingsRow, never, SettingsUpdate>;
      audit_logs: TableDef<AuditLogRow>;
    };
    Views: Record<string, never>;
    Functions: {
      current_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_manager_up: { Args: Record<string, never>; Returns: boolean };
      is_staff_up: { Args: Record<string, never>; Returns: boolean };
      create_order: {
        Args: {
          p_customer_id: string | null;
          p_sales_channel: SalesChannel;
          p_items: Json;
          p_payment_method?: PaymentMethod | null;
          p_discount_type?: DiscountType | null;
          p_discount_value?: number;
          p_promo_code?: string | null;
          p_shipping_amount?: number;
          p_shipping_address?: string | null;
          p_shipping_notes?: string | null;
          p_amount_paid?: number;
          p_notes?: string | null;
        };
        Returns: string;
      };
      update_order_status: {
        Args: { p_order_id: string; p_new_status: OrderStatus; p_note?: string | null };
        Returns: void;
      };
      record_manual_stock_movement: {
        Args: {
          p_variant_id: string;
          p_type: InventoryTxnType;
          p_quantity: number;
          p_notes?: string | null;
        };
        Returns: void;
      };
      receive_purchase_item: {
        Args: { p_purchase_item_id: string; p_quantity: number };
        Returns: void;
      };
      create_return_request: {
        Args: {
          p_order_id: string;
          p_reason: ReturnReason;
          p_items: Json;
          p_notes?: string | null;
        };
        Returns: string;
      };
      resolve_return: {
        Args: { p_return_id: string; p_new_status: ReturnStatus };
        Returns: void;
      };
      log_login: { Args: Record<string, never>; Returns: void };
      get_dashboard_summary: { Args: Record<string, never>; Returns: Json };
      get_sales_series: {
        Args: { p_granularity?: string; p_days?: number };
        Returns: { bucket: string; revenue: number; orders_count: number }[];
      };
      get_top_products: {
        Args: { p_limit?: number; p_days?: number };
        Returns: { product_name: string; units_sold: number; revenue: number }[];
      };
      get_sales_by_category: {
        Args: { p_days?: number };
        Returns: { category_name: string; revenue: number }[];
      };
      get_profit_and_loss: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      create_purchase: {
        Args: {
          p_supplier_id: string;
          p_reference_number: string | null;
          p_order_date: string;
          p_expected_date: string | null;
          p_notes: string | null;
          p_items: Json;
        };
        Returns: string;
      };
      update_purchase_payment_status: {
        Args: { p_purchase_id: string; p_payment_status: PaymentStatus };
        Returns: void;
      };
      get_low_stock_items: {
        Args: { p_limit?: number };
        Returns: {
          inventory_id: string;
          product_variant_id: string;
          product_name: string;
          size: string;
          color: string;
          quantity_on_hand: number;
          reorder_level: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      entity_status: EntityStatus;
      product_status: ProductStatus;
      variant_status: VariantStatus;
      inventory_txn_type: InventoryTxnType;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      purchase_status: PurchaseStatus;
      sales_channel: SalesChannel;
      order_status: OrderStatus;
      discount_type: DiscountType;
      return_reason: ReturnReason;
      return_status: ReturnStatus;
      return_action: ReturnAction;
      expense_category: ExpenseCategory;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
};
