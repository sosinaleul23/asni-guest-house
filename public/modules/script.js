/* ============================================================
   Asni Guest House — Theme + i18n + Full CRUD on Cloudflare D1
   ============================================================ */
const AsniApp = (function () {
  'use strict';

  /* ============================================================
     CONFIG
     ============================================================ */
  const DEFAULT_API = 'https://asni-guest-house.fikrewa7.workers.dev';
  const KEYS = {
    worker: 'asni_worker_url',
    cache:  'asni_cache_v5',
    role:   'asni_role_v2',
    theme:  'asni_theme_v1',
    lang:   'asni_lang_v1'
  };

  let apiBase = (localStorage.getItem(KEYS.worker) || DEFAULT_API).replace(/\/$/, '');
  let onlineMode = false;
  let currentRole = 'Admin';
  let currentTheme = localStorage.getItem(KEYS.theme) || 'dark';
  let currentLang  = localStorage.getItem(KEYS.lang)  || 'am';

  const TABLES = ['rooms', 'users', 'bookings', 'restaurant_tables', 'menu_items', 'orders', 'ad_banners'];

  let db = { rooms:[], users:[], bookings:[], restaurant_tables:[], menu_items:[], orders:[], ad_banners:[] };
  let activeCart = [];
  let revenueChartInst = null, categoryChartInst = null;

  /* ============================================================
     I18N DICTIONARY
     ============================================================ */
  const T = {
    en: {
      // Header / shell
      app_title: 'Asni Guest House', app_chip: 'Jimma',
      app_location: 'Ferenj Arada, Jimma',
      connecting: 'Connecting…', online: 'Cloudflare D1 Online', offline: 'D1 Offline — Local Cache',
      refresh_title: 'Refresh data', theme_toggle: 'Toggle theme', lang_toggle: 'Change language',
      currency: 'Currency', nav_label: 'Menu',

      // Nav
      nav_dashboard: 'Dashboard', nav_rooms: 'Rooms', nav_users: 'Users & Staff',
      nav_bookings: 'Bookings', nav_restaurant: 'Restaurant', nav_tables: 'Restaurant Tables',
      nav_reports: 'Financial Reports', nav_banners: 'Ad Banners', nav_sql: 'D1 SQL Console',

      // Dashboard
      dash_kpi_revenue: 'Total Revenue', dash_kpi_revenue_sub: 'Rooms + Dining',
      dash_kpi_occupancy: 'Occupancy', dash_kpi_bookings: 'Active Bookings',
      dash_kpi_bookings_sub: 'Confirmed / Checked-In', dash_kpi_menu: 'Menu Items',
      dash_kpi_menu_sub: 'Available dishes',
      dash_revenue_chart: 'Revenue Trend (ETB)', dash_category_chart: 'Room Categories',
      dash_rooms_count: 'rooms', dash_no_banners: 'No active banners.',

      // Pages
      rooms_title: 'Rooms Inventory', rooms_sub: 'Manage room types, pricing, and availability.',
      users_title: 'Users & Staff', users_sub: 'Manage admins, receptionists, and guest accounts.',
      bookings_title: 'Bookings & Reservations', bookings_sub: 'Track check-ins, extensions, and cancellations.',
      restaurant_title: 'Restaurant & Menu', restaurant_sub: 'Manage dishes and live kitchen orders.',
      tables_title: 'Restaurant Tables', tables_sub: 'Manage indoor, garden, and rooftop seating.',
      reports_title: 'Financial Reports', reports_sub: 'Live totals computed from bookings and orders.',
      banners_title: 'Ad Banners', banners_sub: 'Promotional slides shown on the dashboard.',
      sql_title: 'Cloudflare D1 SQL Console', sql_sub: 'Run raw SQL against your live database.',

      // Buttons
      btn_add_room: 'Add Room', btn_add_user: 'Add User', btn_new_booking: 'New Booking',
      btn_add_dish: 'Add Dish', btn_cart: 'Cart', btn_add_table: 'Add Table',
      btn_create_banner: 'Create Banner', btn_export_csv: 'Export CSV', btn_reset_schema: 'Reset Schema',
      btn_reconnect: 'Reconnect', btn_test: 'Test', btn_run_query: 'Run Query',
      btn_cancel: 'Cancel', btn_close: 'Close', btn_print: 'Print',
      btn_clear: 'Clear', btn_submit_order: 'Submit Order',
      btn_save_room: 'Save Room', btn_save_user: 'Save User', btn_save_booking: 'Save Booking',
      btn_save_item: 'Save Menu Item', btn_save_table: 'Save Table',
      btn_save_order: 'Save Order', btn_save_banner: 'Save Banner',

      // Table headers
      th_room_num: 'Room #', th_type: 'Type', th_capacity: 'Capacity',
      th_price_night: 'Price / Night', th_status: 'Status', th_description: 'Description',
      th_actions: 'Actions', th_full_name: 'Full Name', th_email: 'Email', th_phone: 'Phone',
      th_role: 'Role', th_created: 'Created', th_id: 'ID', th_guest: 'Guest', th_room: 'Room',
      th_checkin: 'Check-In', th_checkout: 'Check-Out', th_total: 'Total', th_items: 'Items',
      th_target: 'Target', th_payer: 'Payer / Target', th_amount: 'Amount', th_receipt: 'Receipt',
      th_ref: 'Ref', th_date: 'Date', th_order_type: 'Type', th_table_num: 'Table #', th_zone: 'Zone',

      // Forms
      lbl_room_number: 'Room Number', lbl_capacity: 'Capacity', lbl_room_type: 'Room Type',
      lbl_price_night: 'Price / Night (ETB)', lbl_status: 'Status', lbl_description: 'Description',
      lbl_full_name: 'Full Name', lbl_email: 'Email', lbl_phone: 'Phone', lbl_role: 'Role',
      lbl_room: 'Room', lbl_guest_name: 'Guest Name', lbl_guest_phone: 'Guest Phone',
      lbl_checkin: 'Check-In', lbl_checkout: 'Check-Out', lbl_total: 'Total (ETB)',
      lbl_order_type: 'Order Type', lbl_target: 'Target', lbl_name: 'Name', lbl_category: 'Category',
      lbl_price: 'Price (ETB)', lbl_available: 'Available on menu', lbl_title: 'Title',
      lbl_tag: 'Tag', lbl_badge_color: 'Badge Color', lbl_active: 'Active (visible on dashboard)',
      lbl_worker_url: 'Worker API URL', lbl_execute_sql: 'Execute SQL', lbl_output: 'Output',
      lbl_table_num: 'Table #', lbl_zone: 'Zone',

      // Enum display (kept separate so DB values stay English)
      status_Available: 'Available', status_Occupied: 'Occupied',
      status_Cleaning: 'Cleaning', status_Maintenance: 'Maintenance',
      status_Pending: 'Pending', status_Confirmed: 'Confirmed',
      status_CheckedIn: 'CheckedIn', status_CheckedOut: 'CheckedOut',
      status_Cancelled: 'Cancelled', status_Preparing: 'Preparing',
      status_Served: 'Served', status_Reserved: 'Reserved',
      status_Active: 'Active', status_Hidden: 'Hidden',

      rt_Standard: 'Standard', rt_Deluxe: 'Deluxe',
      rt_ExecutiveSuite: 'Executive Suite', rt_FamilySuite: 'Family Suite',

      role_admin: 'admin', role_receptionist: 'receptionist', role_guest: 'guest',

      cat_TraditionalEthiopian: 'Traditional Ethiopian', cat_Breakfast: 'Breakfast',
      cat_MainCourse: 'Main Course', cat_Beverages: 'Beverages', cat_Dessert: 'Dessert',

      zone_IndoorMain: 'Indoor Main', zone_GardenPatio: 'Garden Patio', zone_RooftopLounge: 'Rooftop Lounge',

      ot_RoomService: 'Room Service', ot_RestaurantTable: 'Restaurant Table',

      color_amber: 'Amber', color_blue: 'Blue', color_emerald: 'Emerald',
      color_purple: 'Purple', color_rose: 'Rose',

      // Sections
      room_grid_title: 'Live Room Status Grid',
      menu_catalog_title: 'Menu Catalog', orders_queue_title: 'Kitchen Orders Queue',
      schema_explorer: 'Schema Explorer',

      // Reports
      rep_room_rev: 'Room Revenue', rep_rest_rev: 'Restaurant Revenue', rep_total: 'Grand Total',

      // Cart
      cart_total: 'Order Total:', cart_empty: 'Cart is empty. Add items from the menu.',

      // Receipt
      rcpt_number: 'Receipt #', rcpt_date: 'Date:', rcpt_payer: 'Payer:', rcpt_type: 'Type:',
      rcpt_details: 'Details', rcpt_total_paid: 'Total Paid:',
      rcpt_thanks: 'Thank you! Ameseginalehu!', rcpt_completed: 'Completed',

      // Modal titles
      modal_room_new: 'New Room', modal_room_edit: 'Edit Room',
      modal_user_new: 'New User', modal_user_edit: 'Edit User',
      modal_booking_new: 'New Booking', modal_booking_edit: 'Edit Booking',
      modal_menu_new: 'New Menu Item', modal_menu_edit: 'Edit Menu Item',
      modal_table_new: 'New Table', modal_table_edit: 'Edit Table',
      modal_cart_title: 'New Order', modal_order_edit: 'Edit Order',
      modal_banner_new: 'New Banner', modal_banner_edit: 'Edit Banner',
      modal_edit_generic: 'Edit',

      // Toasts
      toast_connected: 'Connected to Cloudflare D1',
      toast_offline: 'D1 offline — using local cache',
      toast_refresh_start: 'Refreshing…', toast_refresh_done: 'Data refreshed.',
      toast_room_added: 'Added Room', toast_room_updated: 'Updated Room',
      toast_room_deleted: 'Room deleted.',
      toast_user_added: 'Added', toast_user_updated: 'Updated',
      toast_user_deleted: 'User removed.',
      toast_booking_added: 'New booking created.', toast_booking_updated: 'Booking updated.',
      toast_booking_deleted: 'Booking deleted.',
      toast_menu_added: 'Added', toast_menu_updated: 'Updated',
      toast_menu_deleted: 'Menu item removed.',
      toast_table_added: 'Added', toast_table_updated: 'Updated',
      toast_table_deleted: 'Table removed.',
      toast_order_submitted: 'Order placed for', toast_order_updated: 'Order updated.',
      toast_order_deleted: 'Order deleted.',
      toast_banner_added: 'Banner created.', toast_banner_updated: 'Banner updated.',
      toast_banner_deleted: 'Banner removed.',
      toast_cart_added: 'Added to cart.', toast_cart_empty: 'Cart is empty!',
      toast_reset_done: 'Schema reset. All data cleared.',
      toast_exported: 'Exported CSV report.',
      toast_role_switched: 'Switched to', toast_theme_switched: 'Theme switched to',
      toast_lang_switched: 'Language switched to',
      toast_d1_required: 'D1 must be online for this action.',
      toast_worker_online: 'Worker online.', toast_worker_failed: 'Worker test failed',
      toast_confirm_delete: 'Delete this record?',
      toast_confirm_delete_room: 'Delete this room? Related bookings will be removed.',
      toast_confirm_delete_user: 'Delete this user?',
      toast_confirm_delete_booking: 'Delete this booking?',
      toast_confirm_delete_item: 'Remove this menu item?',
      toast_confirm_delete_table: 'Delete this table?',
      toast_confirm_delete_order: 'Delete this order?',
      toast_confirm_delete_banner: 'Delete this banner?',
      toast_confirm_reset: 'WIPE all tables and re-create schema? Data will be lost.',

      // Misc
      misc_select_target: 'Select a target!', misc_enter_url: 'Enter a valid URL',
      misc_no_banners: 'No active banners.', misc_enter_sql: 'Enter a SQL query first.',
      misc_offline_sql: 'D1 is offline — SQL console requires an active connection.',
      misc_total: 'Total', misc_seats: 'seats'
    },

    am: {
      // Header / shell
      app_title: 'አስኒ የእንግዳ ማረፊያ', app_chip: 'ጅማ',
      app_location: 'ፈረንጅ አራዳ፣ ጅማ',
      connecting: 'በመገናኘት ላይ…', online: 'Cloudflare D1 ተገናኝቷል', offline: 'D1 ከመስመር ውጪ — የአካባቢ ቅዳ',
      refresh_title: 'ውሂብ አድስ', theme_toggle: 'ገጽታ ቀይር', lang_toggle: 'ቋንቋ ቀይር',
      currency: 'ምንዛሪ', nav_label: 'ዝርዝር',

      // Nav
      nav_dashboard: 'ዳሽቦርድ', nav_rooms: 'ክፍሎች', nav_users: 'ተጠቃሚዎችና ሰራተኞች',
      nav_bookings: 'ቦታ ማስያዝ', nav_restaurant: 'ምግብ ቤት', nav_tables: 'የምግብ ቤት ጠረጴዛዎች',
      nav_reports: 'የፋይናንስ ሪፖርቶች', nav_banners: 'ማስታወቂያዎች', nav_sql: 'D1 SQL ኮንሶል',

      // Dashboard
      dash_kpi_revenue: 'ጠቅላላ ገቢ', dash_kpi_revenue_sub: 'ክፍል + ምግብ',
      dash_kpi_occupancy: 'የተያዘ መጠን', dash_kpi_bookings: 'ንቁ ቦታ ማስያዞች',
      dash_kpi_bookings_sub: 'የተረጋገጡ / የገቡ', dash_kpi_menu: 'የምናሌ ዕቃዎች',
      dash_kpi_menu_sub: 'ያሉ ምግቦች',
      dash_revenue_chart: 'የገቢ አዝማሚያ (ብር)', dash_category_chart: 'የክፍል ምድቦች',
      dash_rooms_count: 'ክፍሎች', dash_no_banners: 'ንቁ ማስታወቂያ የለም።',

      // Pages
      rooms_title: 'የክፍሎች ክምችት', rooms_sub: 'የክፍል ዓይነቶችን፣ ዋጋና ተገኝነትን ያስተዳድሩ።',
      users_title: 'ተጠቃሚዎችና ሰራተኞች', users_sub: 'አስተዳዳሪዎችን፣ ተቀባዮችንና የእንግዳ መዝገቦችን ያስተዳድሩ።',
      bookings_title: 'ቦታ ማስያዝና ቦታ ማስያዝ', bookings_sub: 'መግቢያዎችን፣ ቅርንጫፎችንና ስረዛዎችን ይከታተሉ።',
      restaurant_title: 'ምግብ ቤትና ምናሌ', restaurant_sub: 'ምግቦችንና የወቅቱን የወጥ ቤት ትዕዛዞች ያስተዳድሩ።',
      tables_title: 'የምግብ ቤት ጠረጴዛዎች', tables_sub: 'የውስጥ፣ የአትክልት ቦታና የጣሪያ መቀመጫዎችን ያስተዳድሩ።',
      reports_title: 'የፋይናንስ ሪፖርቶች', reports_sub: 'ከቦታ ማስያዝና ከትዕዛዞች የተሰሉ የቀጥታ ድምሮች።',
      banners_title: 'ማስታወቂያዎች', banners_sub: 'በዳሽቦርድ ላይ የሚታዩ የማስተዋወቂያ ስላይዶች።',
      sql_title: 'Cloudflare D1 SQL ኮንሶል', sql_sub: 'በቀጥታ ላይ ባለው ዳታቤዝ ላይ SQL ያሂዱ።',

      // Buttons
      btn_add_room: 'ክፍል ጨምር', btn_add_user: 'ተጠቃሚ ጨምር', btn_new_booking: 'አዲስ ቦታ ማስያዝ',
      btn_add_dish: 'ምግብ ጨምር', btn_cart: 'ጋሪ', btn_add_table: 'ጠረጴዛ ጨምር',
      btn_create_banner: 'ማስታወቂያ ፍጠር', btn_export_csv: 'CSV አውጣ', btn_reset_schema: 'ስኪማ አድስ',
      btn_reconnect: 'እንደገና አገናኝ', btn_test: 'ፈትን', btn_run_query: 'ጥያቄ አሂድ',
      btn_cancel: 'ሰርዝ', btn_close: 'ዝጋ', btn_print: 'አትም',
      btn_clear: 'አጽዳ', btn_submit_order: 'ትዕዛዝ አስገባ',
      btn_save_room: 'ክፍል አስቀምጥ', btn_save_user: 'ተጠቃሚ አስቀምጥ', btn_save_booking: 'ቦታ ማስያዝ አስቀምጥ',
      btn_save_item: 'ምግብ አስቀምጥ', btn_save_table: 'ጠረጴዛ አስቀምጥ',
      btn_save_order: 'ትዕዛዝ አስቀምጥ', btn_save_banner: 'ማስታወቂያ አስቀምጥ',

      // Table headers
      th_room_num: 'የክፍል ቁጥር', th_type: 'ዓይነት', th_capacity: 'አቅም',
      th_price_night: 'ዋጋ / ሌሊት', th_status: 'ሁኔታ', th_description: 'መግለጫ',
      th_actions: 'ተግባራት', th_full_name: 'ሙሉ ስም', th_email: 'ኢሜይል', th_phone: 'ስልክ',
      th_role: 'ሚና', th_created: 'የተፈጠረ', th_id: 'መለያ', th_guest: 'እንግዳ', th_room: 'ክፍል',
      th_checkin: 'የገባበት', th_checkout: 'የወጣበት', th_total: 'ጠቅላላ', th_items: 'ዕቃዎች',
      th_target: 'ዒላማ', th_payer: 'ከፋይ / ዒላማ', th_amount: 'መጠን', th_receipt: 'ደረሰኝ',
      th_ref: 'ማጣቀሻ', th_date: 'ቀን', th_order_type: 'ዓይነት', th_table_num: 'የጠረጴዛ ቁጥር', th_zone: 'አካባቢ',

      // Forms
      lbl_room_number: 'የክፍል ቁጥር', lbl_capacity: 'አቅም', lbl_room_type: 'የክፍል ዓይነት',
      lbl_price_night: 'ዋጋ / ሌሊት (ብር)', lbl_status: 'ሁኔታ', lbl_description: 'መግለጫ',
      lbl_full_name: 'ሙሉ ስም', lbl_email: 'ኢሜይል', lbl_phone: 'ስልክ', lbl_role: 'ሚና',
      lbl_room: 'ክፍል', lbl_guest_name: 'የእንግዳ ስም', lbl_guest_phone: 'የእንግዳ ስልክ',
      lbl_checkin: 'የገባበት ቀን', lbl_checkout: 'የወጣበት ቀን', lbl_total: 'ጠቅላላ (ብር)',
      lbl_order_type: 'የትዕዛዝ ዓይነት', lbl_target: 'ዒላማ', lbl_name: 'ስም', lbl_category: 'ምድብ',
      lbl_price: 'ዋጋ (ብር)', lbl_available: 'በምናሌ ላይ አለ', lbl_title: 'ርዕስ',
      lbl_tag: 'መለያ', lbl_badge_color: 'የባጅ ቀለም', lbl_active: 'ንቁ (በዳሽቦርድ ይታያል)',
      lbl_worker_url: 'የሰራተኛ API አድራሻ', lbl_execute_sql: 'SQL አሂድ', lbl_output: 'ውጤት',
      lbl_table_num: 'የጠረጴዛ ቁጥር', lbl_zone: 'አካባቢ',

      // Enum display
      status_Available: 'ነፃ', status_Occupied: 'ተይዟል',
      status_Cleaning: 'በጽዳት ላይ', status_Maintenance: 'ጥገና',
      status_Pending: 'በመጠባበቅ ላይ', status_Confirmed: 'ተረጋግጧል',
      status_CheckedIn: 'ገብቷል', status_CheckedOut: 'ወጥቷል',
      status_Cancelled: 'ተሰርዟል', status_Preparing: 'በዝግጅት ላይ',
      status_Served: 'ቀርቧል', status_Reserved: 'ተይዟል',
      status_Active: 'ንቁ', status_Hidden: 'ተደብቋል',

      rt_Standard: 'መደበኛ', rt_Deluxe: 'ዴሉክስ',
      rt_ExecutiveSuite: 'ኤግዘኪዩቲቭ ስዊት', rt_FamilySuite: 'ፋሚሊ ስዊት',

      role_admin: 'አስተዳዳሪ', role_receptionist: 'ተቀባይ', role_guest: 'እንግዳ',

      cat_TraditionalEthiopian: 'ባህላዊ ኢትዮጵያዊ', cat_Breakfast: 'ቁርስ',
      cat_MainCourse: 'ዋና ምግብ', cat_Beverages: 'መጠጦች', cat_Dessert: 'ጣፋጭ',

      zone_IndoorMain: 'ውስጣዊ ዋና', zone_GardenPatio: 'የአትክልት ቦታ', zone_RooftopLounge: 'የጣሪያ ማረፊያ',

      ot_RoomService: 'የክፍል አገልግሎት', ot_RestaurantTable: 'የምግብ ቤት ጠረጴዛ',

      color_amber: 'ወርቃማ', color_blue: 'ሰማያዊ', color_emerald: 'አረንጓዴ',
      color_purple: 'ወይን ጠጅ', color_rose: 'ሮዝ',

      // Sections
      room_grid_title: 'የክፍሎች ሁኔታ ፍርግርግ',
      menu_catalog_title: 'የምናሌ ካታሎግ', orders_queue_title: 'የወጥ ቤት ትዕዛዞች ወረፋ',
      schema_explorer: 'የስኪማ አሳሽ',

      // Reports
      rep_room_rev: 'የክፍል ገቢ', rep_rest_rev: 'የምግብ ቤት ገቢ', rep_total: 'ጠቅላላ ድምር',

      // Cart
      cart_total: 'የትዕዛዝ ጠቅላላ:', cart_empty: 'ጋሪ ባዶ ነው። ከምናሌ ዕቃዎችን ይጨምሩ።',

      // Receipt
      rcpt_number: 'ደረሰኝ ቁጥር', rcpt_date: 'ቀን:', rcpt_payer: 'ከፋይ:', rcpt_type: 'ዓይነት:',
      rcpt_details: 'ዝርዝሮች', rcpt_total_paid: 'የተከፈለ ጠቅላላ:',
      rcpt_thanks: 'አመሰግናለሁ!', rcpt_completed: 'ተጠናቅቋል',

      // Modal titles
      modal_room_new: 'አዲስ ክፍል', modal_room_edit: 'ክፍል አስተካክል',
      modal_user_new: 'አዲስ ተጠቃሚ', modal_user_edit: 'ተጠቃሚ አስተካክል',
      modal_booking_new: 'አዲስ ቦታ ማስያዝ', modal_booking_edit: 'ቦታ ማስያዝ አስተካክል',
      modal_menu_new: 'አዲስ የምናሌ ዕቃ', modal_menu_edit: 'የምናሌ ዕቃ አስተካክል',
      modal_table_new: 'አዲስ ጠረጴዛ', modal_table_edit: 'ጠረጴዛ አስተካክል',
      modal_cart_title: 'አዲስ ትዕዛዝ', modal_order_edit: 'ትዕዛዝ አስተካክል',
      modal_banner_new: 'አዲስ ማስታወቂያ', modal_banner_edit: 'ማስታወቂያ አስተካክል',
      modal_edit_generic: 'አስተካክል',

      // Toasts
      toast_connected: 'ከ Cloudflare D1 ጋር ተገናኝቷል',
      toast_offline: 'D1 ከመስመር ውጪ — የአካባቢ ቅዳ በመጠቀም ላይ',
      toast_refresh_start: 'በማደስ ላይ…', toast_refresh_done: 'ውሂብ ተጠናቅቋል።',
      toast_room_added: 'ተጨምሯል፡ ክፍል', toast_room_updated: 'ተሻሽሏል፡ ክፍል',
      toast_room_deleted: 'ክፍል ተሰርዟል።',
      toast_user_added: 'ተጨምሯል', toast_user_updated: 'ተሻሽሏል',
      toast_user_deleted: 'ተጠቃሚ ተወግዷል።',
      toast_booking_added: 'አዲስ ቦታ ማስያዝ ተፈጥሯል።', toast_booking_updated: 'ቦታ ማስያዝ ተሻሽሏል።',
      toast_booking_deleted: 'ቦታ ማስያዝ ተሰርዟል።',
      toast_menu_added: 'ተጨምሯል', toast_menu_updated: 'ተሻሽሏል',
      toast_menu_deleted: 'የምናሌ ዕቃ ተወግዷል።',
      toast_table_added: 'ተጨምሯል', toast_table_updated: 'ተሻሽሏል',
      toast_table_deleted: 'ጠረጴዛ ተወግዷል።',
      toast_order_submitted: 'ትዕዛዝ ተልኳል ለ', toast_order_updated: 'ትዕዛዝ ተሻሽሏል።',
      toast_order_deleted: 'ትዕዛዝ ተሰርዟል።',
      toast_banner_added: 'ማስታወቂያ ተፈጥሯል።', toast_banner_updated: 'ማስታወቂያ ተሻሽሏል።',
      toast_banner_deleted: 'ማስታወቂያ ተወግዷል።',
      toast_cart_added: 'ወደ ጋሪ ተጨምሯል።', toast_cart_empty: 'ጋሪ ባዶ ነው!',
      toast_reset_done: 'ስኪማ ተመልሷል። ሁሉም ውሂብ ጠፍቷል።',
      toast_exported: 'CSV ሪፖርት ተልኳል።',
      toast_role_switched: 'ተቀይሯል ወደ', toast_theme_switched: 'ገጽታ ተቀይሯል ወደ',
      toast_lang_switched: 'ቋንቋ ተቀይሯል ወደ',
      toast_d1_required: 'D1 መስመር ላይ መሆን አለበት።',
      toast_worker_online: 'ሰራተኛ በመስመር ላይ ነው።', toast_worker_failed: 'የሰራተኛ ፈተና አልተሳካም',
      toast_confirm_delete: 'ይህን መዝገብ ይሰርዙ?',
      toast_confirm_delete_room: 'ይህን ክፍል ይሰርዙ? ተዛማጅ ቦታ ማስያዞች ይወገዳሉ።',
      toast_confirm_delete_user: 'ይህን ተጠቃሚ ይሰርዙ?',
      toast_confirm_delete_booking: 'ይህን ቦታ ማስያዝ ይሰርዙ?',
      toast_confirm_delete_item: 'ይህን የምናሌ ዕቃ ያስወግዱ?',
      toast_confirm_delete_table: 'ይህን ጠረጴዛ ይሰርዙ?',
      toast_confirm_delete_order: 'ይህን ትዕዛዝ ይሰርዙ?',
      toast_confirm_delete_banner: 'ይህን ማስታወቂያ ይሰርዙ?',
      toast_confirm_reset: 'ሁሉንም ሰንጠረዦች አጥፍተው እንደገና ይፍጠሩ? ውሂብ ይጠፋል።',

      // Misc
      misc_select_target: 'ዒላማ ይምረጡ!', misc_enter_url: 'ትክክለኛ አድራሻ ያስገቡ',
      misc_no_banners: 'ንቁ ማስታወቂያ የለም።', misc_enter_sql: 'መጀመሪያ SQL ጥያቄ ያስገቡ።',
      misc_offline_sql: 'D1 ከመስመር ውጪ ነው — የ SQL ኮንሶል ንቁ ግንኙነት ይፈልጋል።',
      misc_total: 'ጠቅላላ', misc_seats: 'መቀመጫ'
    }
  };
/* ============================================================
   BANNER LOCALISATION — keyed by the English title (as stored in D1)
   No schema change required. Falls back to DB text if a banner
   isn't found here.
   ============================================================ */
const BANNER_I18N = {
  en: {
    'Jimma Coffee Tour': {
      title: 'Jimma Coffee Tour',
      description: 'Explore authentic coffee farms around Jimma. Book guided tours at reception.',
      tag: 'Special Experience'
    },
    'Aba Jifar Palace Excursion': {
      title: 'Aba Jifar Palace Excursion',
      description: 'Visit the historic King Aba Jifar II Palace located near Ferenj Arada.',
      tag: 'Cultural Heritage'
    },
    'Free Airport Shuttle': {
      title: 'Free Airport Shuttle',
      description: 'Complimentary shuttle service to and from Jimma Airport (JIM) for Executive guests.',
      tag: 'Guest Perk'
    }
  },
  am: {
    'Jimma Coffee Tour': {
      title: 'የጅማ ቡና ጉብኝት',
      description: 'በጅማ ዙሪያ ያሉ እውነተኛ የቡና እርሻዎችን ያስሱ። በመቀበያ ቦታ የተመራ ጉብኝት ያስይዙ።',
      tag: 'ልዩ ተሞክሮ'
    },
    'Aba Jifar Palace Excursion': {
      title: 'የአባ ጅፋር ቤተ መንግስት ጉዞ',
      description: 'በፈረንጅ አራዳ አቅራቢያ የሚገኘውን ታሪካዊውን የንጉስ አባ ጅፋር ዳግማዊ ቤተ መንግስት ይጎብኙ።',
      tag: 'የባህል ቅርስ'
    },
    'Free Airport Shuttle': {
      title: 'ነፃ የአውሮፕላን ማስተላለፊያ',
      description: 'ለኤግዘኪዩቲቭ እንግዶች ከጅማ አውሮፕላን ማረፊያ (JIM) ና ወደ እሱ ነፃ የማስተላለፊያ አገልግሎት።',
      tag: 'የእንግዳ ጥቅም'
    }
  }
};

  function t(key) {
    return (T[currentLang] && T[currentLang][key]) || (T.en[key]) || key;
  }

  /* ============================================================
     UTILS
     ============================================================ */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const fmtETB = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = s => (s ? String(s).split('T')[0].split(' ')[0] : '');

  function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> <span>${esc(msg)}</span>`;
    c.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function setConnectionStatus(state) {
    const dot = document.getElementById('syncDot');
    const txt = document.getElementById('syncText');
    if (!dot || !txt) return;
    dot.classList.remove('online', 'offline');
    if (state === 'online')  { dot.classList.add('online');  txt.textContent = t('online'); }
    else if (state === 'offline') { dot.classList.add('offline'); txt.textContent = t('offline'); }
    else { txt.textContent = t('connecting'); }
  }

  /* ============================================================
     THEME
     ============================================================ */
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEYS.theme, theme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    // Refresh chart colours (axes/grid differ in light)
    renderCharts();
  }
  function toggleTheme() {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(`${t('toast_theme_switched')} ${next}`);
  }

  /* ============================================================
     LANGUAGE
     ============================================================ */
  function applyLang(lang, silent = false) {
    currentLang = lang;
    localStorage.setItem(KEYS.lang, lang);
    document.documentElement.setAttribute('lang', lang === 'am' ? 'am' : 'en');
    document.body.classList.toggle('lang-am', lang === 'am');
    const label = document.getElementById('langLabel');
    if (label) label.textContent = lang === 'am' ? 'አማ' : 'EN';

    // Static elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val) el.setAttribute('title', val);
    });

    // Role badge label needs re-localization
    updateRoleBadge();

    // Dynamic content
    renderAll();

    if (!silent) showToast(`${t('toast_lang_switched')} ${lang === 'am' ? 'አማርኛ' : 'English'}`);
  }

  /* ============================================================
     D1 API
     ============================================================ */
  async function apiQuery(sql, params = []) {
    const res = await fetch(`${apiBase}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    });
    let data; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  async function apiHealth() {
    const res = await fetch(`${apiBase}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  async function loadAllFromD1() {
    const results = await Promise.all(TABLES.map(tbl => apiQuery(`SELECT * FROM "${tbl}" ORDER BY id ASC`)));
    const out = {};
    TABLES.forEach((tbl, i) => { out[tbl] = results[i].results || []; });
    return out;
  }

  /* ============================================================
     LOCAL CACHE
     ============================================================ */
  function persistLocalCache() { try { localStorage.setItem(KEYS.cache, JSON.stringify(db)); } catch {} }
  function loadLocalCache() {
    try {
      const raw = localStorage.getItem(KEYS.cache);
      if (raw) { const p = JSON.parse(raw); for (const tbl of TABLES) db[tbl] = Array.isArray(p[tbl]) ? p[tbl] : []; }
    } catch {}
  }

  /* ============================================================
     CRUD helpers
     ============================================================ */
  async function dbInsert(table, obj) {
    if (!onlineMode) { const id = obj.id ?? Date.now(); db[table].push({ ...obj, id }); persistLocalCache(); return id; }
    const cols = Object.keys(obj).filter(k => obj[k] !== undefined);
    const colList = cols.map(c => `"${c}"`).join(', ');
    const ph = cols.map(() => '?').join(', ');
    const vals = cols.map(c => obj[c]);
    const res = await apiQuery(`INSERT INTO "${table}" (${colList}) VALUES (${ph})`, vals);
    return res.meta?.last_row_id;
  }
  async function dbUpdate(table, id, obj) {
    if (!onlineMode) { const r = db[table].find(x => x.id === id); if (r) Object.assign(r, obj); persistLocalCache(); return; }
    const cols = Object.keys(obj).filter(k => obj[k] !== undefined);
    const assign = cols.map(c => `"${c}" = ?`).join(', ');
    const vals = [...cols.map(c => obj[c]), id];
    await apiQuery(`UPDATE "${table}" SET ${assign} WHERE id = ?`, vals);
  }
  async function dbDelete(table, id) {
    if (!onlineMode) { db[table] = db[table].filter(x => x.id !== id); persistLocalCache(); return; }
    await apiQuery(`DELETE FROM "${table}" WHERE id = ?`, [id]);
  }
  async function reload() {
    if (onlineMode) {
      try { db = await loadAllFromD1(); }
      catch (e) { console.error(e); showToast('Refresh failed — ' + e.message, 'error'); }
    }
    renderAll();
  }

  /* ============================================================
     BOOT
     ============================================================ */
  async function boot() {
    setConnectionStatus('connecting');
    const statusEl = document.getElementById('workerStatusText');
    if (statusEl) statusEl.textContent = `Connecting to ${apiBase}…`;
    try {
      const health = await apiHealth();
      if (statusEl) statusEl.textContent = `✓ Online — ${health.app || 'Asni D1 API'} @ ${apiBase}`;
      db = await loadAllFromD1();
      onlineMode = true;
      setConnectionStatus('online');
      showToast(t('toast_connected'));
    } catch (e) {
      console.warn('D1 offline:', e);
      onlineMode = false;
      loadLocalCache();
      setConnectionStatus('offline');
      if (statusEl) statusEl.textContent = `⚠ Offline — ${e.message}`;
      showToast(t('toast_offline'), 'error');
    }
    renderAll();
  }

  /* ============================================================
     ROLES
     ============================================================ */
  function updateRoleBadge() {
    const label = document.getElementById('roleLabel');
    const icon = document.getElementById('roleIcon');
    if (label) label.textContent = currentRole;
    if (icon) {
      icon.className = 'fa-solid ' + (
        currentRole === 'Admin' ? 'fa-user-shield' :
        currentRole === 'Receptionist' ? 'fa-headset' : 'fa-user'
      );
    }
  }

  function setRole(role) {
    currentRole = role;
    localStorage.setItem(KEYS.role, role);

    document.body.classList.remove('role-admin', 'role-receptionist', 'role-guest');
    const cls = role === 'Admin' ? 'role-admin' : role === 'Receptionist' ? 'role-receptionist' : 'role-guest';
    document.body.classList.add(cls);

    updateRoleBadge();

    const roleKey = role.toLowerCase();
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const allowed = (btn.getAttribute('data-roles') || '').split(',');
      btn.classList.toggle('is-hidden', !allowed.includes(roleKey));
    });

    document.querySelectorAll('.can-edit').forEach(b => {
      b.classList.toggle('hidden', roleKey === 'guest');
    });

    const activeBtn = document.querySelector('.nav-btn.is-active');
    if (activeBtn && activeBtn.classList.contains('is-hidden')) {
      document.querySelector('.nav-btn[data-tab="dashboard"]')?.click();
    }
    showToast(`${t('toast_role_switched')} ${role}`);
  }

  /* ============================================================
     RENDERERS
     ============================================================ */
  function renderDashboard() {
    const occupied = db.rooms.filter(r => r.status === 'Occupied').length;
    const total = db.rooms.length;
    const occRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const roomRev = db.bookings.reduce((s, b) => s + Number(b.total_amount_etb || 0), 0);
    const restRev = db.orders.reduce((s, o) => s + Number(o.total_amount_etb || 0), 0);

    document.getElementById('kpiTotalRev').textContent = `${fmtETB(roomRev + restRev)} ETB`;
    document.getElementById('kpiOccupancy').textContent = `${occRate}%`;
    document.getElementById('kpiOccupancySub').textContent = `${occupied} / ${total} ${t('dash_rooms_count')}`;
    document.getElementById('kpiGuests').textContent =
      db.bookings.filter(b => b.status === 'Confirmed' || b.status === 'CheckedIn').length;
    document.getElementById('kpiMenuItems').textContent =
      db.menu_items.filter(m => Number(m.available) === 1).length;

    const bannerBox = document.getElementById('dashboardBannerContainer');
const active = db.ad_banners.filter(b => Number(b.active) === 1);

if (active.length > 0) {
  const b = active[0];
  const bg = b.badge_color || 'bg-amber-600';
  
  // Look up the localized version of this banner by its English title.
  // The map is BANNER_I18N[lang][englishTitle].
  const map = BANNER_I18N[currentLang] || {};
  const translated = map[b.title]; // exact match on the English title string
  
  const title = translated?.title || b.title;
  const desc = translated?.description || b.description;
  const tag = translated?.tag || b.tag;
  
  bannerBox.innerHTML = `
    <div>
      <span class="be-tag ${esc(bg)}">${esc(tag)}</span>
      <h2 class="be-title">${esc(title)}</h2>
      <p class="be-desc">${esc(desc)}</p>
    </div>`;
} else {
  bannerBox.innerHTML = `<div class="be-desc">${esc(t('dash_no_banners'))}</div>`;
}
    
    renderCharts();
  }

  function renderCharts() {
    const isLight = currentTheme === 'light';
    const gridColor = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.05)';
    const tickColor = isLight ? '#64748b' : '#94A3B8';

    const ctx1 = document.getElementById('revenueChart');
    if (ctx1 && window.Chart) {
      if (revenueChartInst) revenueChartInst.destroy();
      const labels = [], data = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        labels.push(d.toLocaleString(currentLang === 'am' ? 'am' : 'en-US', { month: 'short' }));
        const rSum = db.bookings.filter(b => (b.check_in_date || '').startsWith(key))
          .reduce((s, b) => s + Number(b.total_amount_etb || 0), 0);
        const oSum = db.orders.filter(o => (o.created_at || '').startsWith(key))
          .reduce((s, o) => s + Number(o.total_amount_etb || 0), 0);
        data.push(rSum + oSum);
      }
      revenueChartInst = new Chart(ctx1, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Revenue (ETB)', data,
          borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } }
          } }
      });
    }
    const ctx2 = document.getElementById('categoryChart');
    if (ctx2 && window.Chart) {
      if (categoryChartInst) categoryChartInst.destroy();
      const types = ['Standard', 'Deluxe', 'Executive Suite', 'Family Suite'];
      categoryChartInst = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: types.map(v => t('rt_' + v.replace(/\s+/g, ''))),
          datasets: [{ data: types.map(v => db.rooms.filter(r => r.room_type === v).length),
            backgroundColor: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'] }]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: tickColor, boxWidth: 10, font: { size: 10 } } } } }
      });
    }
  }

  function statusPill(value) {
    const key = 'status_' + value;
    const label = t(key);
    const cls = value === 'Occupied' || value === 'Cancelled' || value === 'Maintenance' ? 'pill-rose'
              : value === 'Cleaning' || value === 'Pending' || value === 'Preparing' || value === 'Reserved' ? 'pill-amber'
              : value === 'CheckedIn' || value === 'Served' || value === 'Available' || value === 'Active' ? 'pill-emerald'
              : 'pill-sky';
    return `<span class="pill ${cls}">${esc(label)}</span>`;
  }

  function rolePill(role) {
    const cls = role === 'admin' ? 'pill-rose' : role === 'receptionist' ? 'pill-sky' : 'pill-slate';
    return `<span class="pill ${cls}">${esc(t('role_' + role))}</span>`;
  }

  function renderRooms() {
    const tbody = document.getElementById('roomsTable'); tbody.innerHTML = '';
    db.rooms.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700;color:var(--text-strong)">${esc(t('th_room_num'))} ${esc(r.room_number)}</td>
        <td>${esc(t('rt_' + r.room_type.replace(/\s+/g, '')))}</td>
        <td>${r.capacity}</td>
        <td style="font-weight:700;color:var(--amber)">${fmtETB(r.price_per_night_etb)} ETB</td>
        <td>${statusPill(r.status)}</td>
        <td class="hide-lg" style="color:var(--muted);font-size:0.75rem">${esc(r.description || '')}</td>
        <td class="text-right">
          <div style="display:inline-flex;gap:0.35rem">
            <button onclick="AsniApp.openRoomModal(${r.id})" class="can-edit icon-sq"><i class="fa-solid fa-pen"></i></button>
            <button onclick="AsniApp.deleteRoom(${r.id})" class="can-edit icon-sq danger"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function renderUsers() {
    const tbody = document.getElementById('usersTable'); tbody.innerHTML = '';
    db.users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700;color:var(--text-strong)">${esc(u.full_name)}</td>
        <td style="font-family:monospace;color:var(--muted)">${esc(u.email)}</td>
        <td class="hide-sm" style="font-family:monospace;color:var(--muted)">${esc(u.phone || '—')}</td>
        <td>${rolePill(u.role)}</td>
        <td class="hide-lg" style="color:var(--muted);font-size:0.7rem">${esc(fmtDate(u.created_at))}</td>
        <td class="text-right">
          <div style="display:inline-flex;gap:0.35rem">
            <button onclick="AsniApp.openUserModal(${u.id})" class="can-edit icon-sq"><i class="fa-solid fa-pen"></i></button>
            <button onclick="AsniApp.deleteUser(${u.id})" class="can-edit icon-sq danger"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function renderBookings() {
    const grid = document.getElementById('roomMatrixGrid'); grid.innerHTML = '';
    db.rooms.forEach(r => {
      const cls = r.status === 'Occupied' ? 'matrix-occupied'
                : r.status === 'Cleaning' ? 'matrix-cleaning'
                : r.status === 'Maintenance' ? 'matrix-maintenance'
                : 'matrix-available';
      const cell = document.createElement('div');
      cell.className = `matrix-cell ${cls}`;
      cell.innerHTML = `<span class="m-num">#${esc(r.room_number)}</span><span class="m-status">${esc(t('status_' + r.status))}</span>`;
      grid.appendChild(cell);
    });

    const tbody = document.getElementById('bookingsTable'); tbody.innerHTML = '';
    db.bookings.forEach(b => {
      const room = db.rooms.find(r => r.id === b.room_id);
      const roomLabel = room ? `${t('th_room')} ${room.room_number}` : `${t('th_room')} #${b.room_id}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace;color:var(--muted);font-size:0.72rem">#${b.id}</td>
        <td style="font-weight:700;color:var(--text-strong)">${esc(b.guest_name)}</td>
        <td class="hide-md" style="font-family:monospace;color:var(--muted);font-size:0.72rem">${esc(b.guest_phone)}</td>
        <td>${esc(roomLabel)}</td>
        <td style="color:var(--muted)">${esc(fmtDate(b.check_in_date))}</td>
        <td class="hide-sm" style="color:var(--muted)">${esc(fmtDate(b.check_out_date))}</td>
        <td style="font-weight:700;color:var(--amber);white-space:nowrap">${fmtETB(b.total_amount_etb)} ETB</td>
        <td>${statusPill(b.status)}</td>
        <td class="text-right">
          <div style="display:inline-flex;gap:0.35rem">
            <button onclick="AsniApp.openBookingModal(${b.id})" class="can-edit icon-sq"><i class="fa-solid fa-pen"></i></button>
            <button onclick="AsniApp.deleteBooking(${b.id})" class="can-edit icon-sq danger"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function renderRestaurant() {
    const mg = document.getElementById('menuCatalogGrid'); mg.innerHTML = '';
    db.menu_items.forEach(it => {
      const avail = Number(it.available) === 1;
      const c = document.createElement('div');
      c.className = 'menu-card';
      c.innerHTML = `
        <div>
          <div class="m-tags">
            <span class="menu-tag">${esc(t('cat_' + it.category.replace(/\s+/g, '')))}</span>
            <span class="menu-tag ${avail ? 'avail' : 'hidden-dish'}">${avail ? t('status_Available') : t('status_Hidden')}</span>
          </div>
          <h4 class="m-name" style="margin-top:0.4rem">${esc(it.name)}</h4>
          <p class="m-desc">${esc(it.description || '')}</p>
        </div>
        <div class="m-foot">
          <span class="m-price">${fmtETB(it.price_etb)} ETB</span>
          <div class="m-acts">
            <button onclick="AsniApp.addToCart(${it.id})" class="can-edit icon-sq add" title="${esc(t('btn_cart'))}"><i class="fa-solid fa-plus"></i></button>
            <button onclick="AsniApp.openMenuModal(${it.id})" class="can-edit icon-sq"><i class="fa-solid fa-pen"></i></button>
            <button onclick="AsniApp.deleteMenuItem(${it.id})" class="can-edit icon-sq danger"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
      mg.appendChild(c);
    });

    const ot = document.getElementById('ordersTable'); ot.innerHTML = '';
    db.orders.forEach(o => {
      let parsed = []; try { parsed = JSON.parse(o.items_json || '[]'); } catch {}
      const summary = parsed.map(p => `${p.name} ×${p.qty || 1}`).join(', ') || '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace;color:var(--muted);font-size:0.72rem">#${o.id}</td>
        <td class="hide-sm" style="color:var(--muted);font-size:0.72rem">${esc(t('ot_' + o.order_type.replace(/\s+/g, '')))}</td>
        <td style="font-weight:600;color:var(--text-strong)">${esc(o.target_identifier)}</td>
        <td class="hide-md" style="color:var(--muted);font-size:0.72rem">${esc(summary)}</td>
        <td style="font-weight:700;color:var(--amber);white-space:nowrap">${fmtETB(o.total_amount_etb)} ETB</td>
        <td>${statusPill(o.status)}</td>
        <td class="text-right">
          <div style="display:inline-flex;gap:0.35rem">
            <button onclick="AsniApp.openOrderModal(${o.id})" class="can-edit icon-sq"><i class="fa-solid fa-pen"></i></button>
            <button onclick="AsniApp.deleteOrder(${o.id})" class="can-edit icon-sq danger"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>`;
      ot.appendChild(tr);
    });
  }

  function renderTables() {
    const tbody = document.getElementById('tablesTable'); tbody.innerHTML = '';
    db.restaurant_tables.forEach(rt => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700;color:var(--text-strong)">${esc(rt.table_number)}</td>
        <td>${rt.seating_capacity} ${esc(t('misc_seats'))}</td>
        <td style="color:var(--text-mid)">${esc(t('zone_' + rt.zone.replace(/\s+/g, '')))}</td>
        <td>${statusPill(rt.status)}</td>
        <td class="text-right">
          <div style="display:inline-flex;gap:0.35rem">
            <button onclick="AsniApp.openTableModal(${rt.id})" class="can-edit icon-sq"><i class="fa-solid fa-pen"></i></button>
            <button onclick="AsniApp.deleteTable(${rt.id})" class="can-edit icon-sq danger"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function computeLedger() {
    const rows = [];
    db.bookings.forEach(b => {
      const room = db.rooms.find(r => r.id === b.room_id);
      rows.push({
        ref: 'B' + b.id,
        date: fmtDate(b.check_in_date),
        type: 'Room Charge',
        desc: `Booking — ${room ? 'Room ' + room.room_number : 'Room #' + b.room_id} (${t('status_' + b.status)})`,
        payer: b.guest_name,
        amount: Number(b.total_amount_etb) || 0
      });
    });
    db.orders.forEach(o => {
      let parsed = []; try { parsed = JSON.parse(o.items_json || '[]'); } catch {}
      const summary = parsed.map(p => `${p.name} ×${p.qty || 1}`).join(', ');
      rows.push({
        ref: 'O' + o.id,
        date: fmtDate(o.created_at) || new Date().toISOString().slice(0, 10),
        type: o.order_type === 'Room Service' ? 'Room Service' : 'Restaurant POS',
        desc: summary || (o.order_type + ' — ' + o.target_identifier),
        payer: o.target_identifier,
        amount: Number(o.total_amount_etb) || 0
      });
    });
    return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  function renderReports() {
    const rows = computeLedger();
    const roomRev = db.bookings.reduce((s, b) => s + Number(b.total_amount_etb || 0), 0);
    const restRev = db.orders.reduce((s, o) => s + Number(o.total_amount_etb || 0), 0);
    document.getElementById('repRoomRev').textContent = `${fmtETB(roomRev)} ETB`;
    document.getElementById('repRestRev').textContent = `${fmtETB(restRev)} ETB`;
    document.getElementById('repTotal').textContent = `${fmtETB(roomRev + restRev)} ETB`;

    const tbody = document.getElementById('reportsTableBody'); tbody.innerHTML = '';
    rows.forEach(l => {
      const isRoom = l.type === 'Room Charge';
      const isRest = l.type === 'Restaurant POS';
      const pillCls = isRoom ? 'pill-emerald' : isRest ? 'pill-rose' : 'pill-sky';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace;color:var(--muted);font-size:0.72rem">${esc(l.ref)}</td>
        <td class="hide-sm" style="color:var(--muted);font-size:0.72rem">${esc(l.date)}</td>
        <td><span class="pill ${pillCls}">${esc(l.type)}</span></td>
        <td class="hide-md" style="color:var(--text-mid);font-size:0.72rem">${esc(l.desc)}</td>
        <td style="color:var(--text);font-size:0.72rem">${esc(l.payer)}</td>
        <td style="font-weight:700;color:var(--emerald);white-space:nowrap">${fmtETB(l.amount)} ETB</td>
        <td class="text-right">
          <button onclick="AsniApp.printReceipt('${esc(l.payer)}','${esc(l.desc)}',${Number(l.amount)})" class="icon-sq"><i class="fa-solid fa-print"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function renderBanners() {
    const g = document.getElementById('bannersGrid'); g.innerHTML = '';
    db.ad_banners.forEach(b => {
      const bg = b.badge_color || 'bg-amber-600';
      const activeFlag = Number(b.active) === 1;
      const c = document.createElement('div');
      c.className = 'glass-panel';
      c.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;flex-wrap:wrap">
          <span class="be-tag ${esc(bg)}">${esc(b.tag)}</span>
          <div style="display:flex;align-items:center;gap:0.4rem">
            <span style="font-size:10px;font-weight:800;${activeFlag ? 'color:#6ee7b7' : 'color:var(--muted)'}">${esc(activeFlag ? t('status_Active') : t('status_Hidden'))}</span>
            <button onclick="AsniApp.openBannerModal(${b.id})" class="can-edit icon-sq"><i class="fa-solid fa-pen"></i></button>
            <button onclick="AsniApp.deleteBanner(${b.id})" class="can-edit icon-sq danger"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <h4 style="font-weight:700;color:var(--text-strong);margin:0.5rem 0 0.4rem">${esc(b.title)}</h4>
        <p style="font-size:0.78rem;color:var(--text-mid)">${esc(b.description)}</p>`;
      g.appendChild(c);
    });
  }

  function renderSchema() {
    const tree = document.getElementById('schemaTree'); if (!tree) return;
    const rows = TABLES.map(tbl => `<div>${tbl} (${db[tbl].length})</div>`).join('');
    tree.innerHTML = `
      <div>
        <div style="font-weight:700;color:var(--teal)"><i class="fa-solid fa-database"></i> asni_d1_db</div>
        <div style="padding-left:0.75rem;color:var(--muted);margin-top:0.3rem">${rows}</div>
      </div>`;
  }

  function renderAll() {
    renderDashboard(); renderRooms(); renderUsers(); renderBookings();
    renderRestaurant(); renderTables(); renderReports(); renderBanners(); renderSchema();
  }

  /* ============================================================
     MODALS
     ============================================================ */
  function openModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  }

  /* ============================================================
     ROOMS
     ============================================================ */
  function openRoomModal(id = null) {
    document.getElementById('formRoom').reset();
    document.getElementById('roomEditId').value = id || '';
    document.getElementById('modalRoomTitle').innerHTML = id
      ? `<i class="fa-solid fa-pen text-amber"></i> ${esc(t('modal_room_edit'))}`
      : `<i class="fa-solid fa-plus text-amber"></i> ${esc(t('modal_room_new'))}`;
    if (id) {
      const r = db.rooms.find(x => x.id === id);
      if (r) {
        document.getElementById('roomNumInput').value = r.room_number;
        document.getElementById('roomTypeInput').value = r.room_type;
        document.getElementById('roomCapacityInput').value = r.capacity;
        document.getElementById('roomPriceInput').value = r.price_per_night_etb;
        document.getElementById('roomStatusInput').value = r.status;
        document.getElementById('roomDescInput').value = r.description || '';
      }
    }
    openModal('modalRoom');
  }
  async function handleRoomSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('roomEditId').value;
    const payload = {
      room_number: document.getElementById('roomNumInput').value.trim(),
      room_type: document.getElementById('roomTypeInput').value,
      capacity: parseInt(document.getElementById('roomCapacityInput').value),
      price_per_night_etb: parseFloat(document.getElementById('roomPriceInput').value),
      status: document.getElementById('roomStatusInput').value,
      description: document.getElementById('roomDescInput').value.trim()
    };
    try {
      if (editId) { await dbUpdate('rooms', parseInt(editId), payload); showToast(`${t('toast_room_updated')} ${payload.room_number}`); }
      else        { await dbInsert('rooms', payload); showToast(`${t('toast_room_added')} ${payload.room_number}`); }
      closeModal('modalRoom');
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteRoom(id) {
    if (!confirm(t('toast_confirm_delete_room'))) return;
    try { await dbDelete('rooms', id); showToast(t('toast_room_deleted')); await reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  /* ============================================================
     USERS
     ============================================================ */
  function openUserModal(id = null) {
    document.getElementById('formUser').reset();
    document.getElementById('userEditId').value = id || '';
    document.getElementById('modalUserTitle').innerHTML = id
      ? `<i class="fa-solid fa-pen text-sky"></i> ${esc(t('modal_user_edit'))}`
      : `<i class="fa-solid fa-user-plus text-sky"></i> ${esc(t('modal_user_new'))}`;
    if (id) {
      const u = db.users.find(x => x.id === id);
      if (u) {
        document.getElementById('userNameInput').value = u.full_name;
        document.getElementById('userEmailInput').value = u.email;
        document.getElementById('userPhoneInput').value = u.phone || '';
        document.getElementById('userRoleInput').value = u.role;
      }
    }
    openModal('modalUser');
  }
  async function handleUserSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('userEditId').value;
    const payload = {
      full_name: document.getElementById('userNameInput').value.trim(),
      email: document.getElementById('userEmailInput').value.trim(),
      phone: document.getElementById('userPhoneInput').value.trim(),
      role: document.getElementById('userRoleInput').value
    };
    try {
      if (editId) { await dbUpdate('users', parseInt(editId), payload); showToast(`${t('toast_user_updated')} ${payload.full_name}`); }
      else        { await dbInsert('users', payload); showToast(`${t('toast_user_added')} ${payload.full_name}`); }
      closeModal('modalUser');
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteUser(id) {
    if (!confirm(t('toast_confirm_delete_user'))) return;
    try { await dbDelete('users', id); showToast(t('toast_user_deleted')); await reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  /* ============================================================
     BOOKINGS
     ============================================================ */
  function openBookingModal(id = null) {
    document.getElementById('formBooking').reset();
    document.getElementById('bookingEditId').value = id || '';
    document.getElementById('modalBookingTitle').innerHTML = id
      ? `<i class="fa-solid fa-pen text-indigo"></i> ${esc(t('modal_booking_edit'))}`
      : `<i class="fa-solid fa-calendar-plus text-indigo"></i> ${esc(t('modal_booking_new'))}`;
    const rs = document.getElementById('bookingRoomSelect');
    rs.innerHTML = '';
    db.rooms.forEach(r => {
      const o = document.createElement('option');
      o.value = r.id;
      o.textContent = `${t('th_room')} ${r.room_number} — ${t('rt_' + r.room_type.replace(/\s+/g,''))} (${fmtETB(r.price_per_night_etb)} ETB)`;
      rs.appendChild(o);
    });
    if (id) {
      const b = db.bookings.find(x => x.id === id);
      if (b) {
        rs.value = b.room_id;
        document.getElementById('bookingGuestNameInput').value = b.guest_name;
        document.getElementById('bookingGuestPhoneInput').value = b.guest_phone;
        document.getElementById('bookingCheckinInput').value = fmtDate(b.check_in_date);
        document.getElementById('bookingCheckoutInput').value = fmtDate(b.check_out_date);
        document.getElementById('bookingTotalInput').value = b.total_amount_etb;
        document.getElementById('bookingStatusInput').value = b.status;
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('bookingCheckinInput').value = today;
      document.getElementById('bookingCheckoutInput').value = today;
      autoFillBookingTotal();
    }
    openModal('modalBooking');
  }
  function autoFillBookingTotal() {
    const roomId = parseInt(document.getElementById('bookingRoomSelect').value);
    const ci = document.getElementById('bookingCheckinInput').value;
    const co = document.getElementById('bookingCheckoutInput').value;
    const room = db.rooms.find(r => r.id === roomId);
    if (!room || !ci || !co) return;
    const nights = Math.max(1, Math.round((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24)));
    document.getElementById('bookingTotalInput').value = (nights * Number(room.price_per_night_etb || 0)).toFixed(2);
  }
  async function handleBookingSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('bookingEditId').value;
    const roomId = parseInt(document.getElementById('bookingRoomSelect').value);
    const payload = {
      room_id: roomId,
      guest_name: document.getElementById('bookingGuestNameInput').value.trim(),
      guest_phone: document.getElementById('bookingGuestPhoneInput').value.trim(),
      check_in_date: document.getElementById('bookingCheckinInput').value,
      check_out_date: document.getElementById('bookingCheckoutInput').value,
      total_amount_etb: parseFloat(document.getElementById('bookingTotalInput').value),
      status: document.getElementById('bookingStatusInput').value
    };
    try {
      if (editId) { await dbUpdate('bookings', parseInt(editId), payload); showToast(t('toast_booking_updated')); }
      else        { await dbInsert('bookings', payload); showToast(t('toast_booking_added')); }
      if (payload.status === 'CheckedIn') await dbUpdate('rooms', roomId, { status: 'Occupied' });
      else if (payload.status === 'CheckedOut' || payload.status === 'Cancelled') await dbUpdate('rooms', roomId, { status: 'Cleaning' });
      closeModal('modalBooking');
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteBooking(id) {
    if (!confirm(t('toast_confirm_delete_booking'))) return;
    try { await dbDelete('bookings', id); showToast(t('toast_booking_deleted')); await reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  /* ============================================================
     MENU ITEMS
     ============================================================ */
  function openMenuModal(id = null) {
    document.getElementById('formMenu').reset();
    document.getElementById('menuEditId').value = id || '';
    document.getElementById('modalMenuTitle').innerHTML = id
      ? `<i class="fa-solid fa-pen text-rose"></i> ${esc(t('modal_menu_edit'))}`
      : `<i class="fa-solid fa-plus text-rose"></i> ${esc(t('modal_menu_new'))}`;
    if (id) {
      const m = db.menu_items.find(x => x.id === id);
      if (m) {
        document.getElementById('menuNameInput').value = m.name;
        document.getElementById('menuCategoryInput').value = m.category;
        document.getElementById('menuPriceInput').value = m.price_etb;
        document.getElementById('menuAvailableInput').checked = Number(m.available) === 1;
        document.getElementById('menuDescInput').value = m.description || '';
      }
    } else {
      document.getElementById('menuAvailableInput').checked = true;
    }
    openModal('modalMenu');
  }
  async function handleMenuSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('menuEditId').value;
    const payload = {
      name: document.getElementById('menuNameInput').value.trim(),
      category: document.getElementById('menuCategoryInput').value,
      price_etb: parseFloat(document.getElementById('menuPriceInput').value),
      available: document.getElementById('menuAvailableInput').checked ? 1 : 0,
      description: document.getElementById('menuDescInput').value.trim()
    };
    try {
      if (editId) { await dbUpdate('menu_items', parseInt(editId), payload); showToast(`${t('toast_menu_updated')} ${payload.name}`); }
      else        { await dbInsert('menu_items', payload); showToast(`${t('toast_menu_added')} ${payload.name}`); }
      closeModal('modalMenu');
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteMenuItem(id) {
    if (!confirm(t('toast_confirm_delete_item'))) return;
    try { await dbDelete('menu_items', id); showToast(t('toast_menu_deleted')); await reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  /* ============================================================
     RESTAURANT TABLES
     ============================================================ */
  function openTableModal(id = null) {
    document.getElementById('formTable').reset();
    document.getElementById('tableEditId').value = id || '';
    document.getElementById('modalTableTitle').innerHTML = id
      ? `<i class="fa-solid fa-pen text-teal"></i> ${esc(t('modal_table_edit'))}`
      : `<i class="fa-solid fa-plus text-teal"></i> ${esc(t('modal_table_new'))}`;
    if (id) {
      const rt = db.restaurant_tables.find(x => x.id === id);
      if (rt) {
        document.getElementById('tableNumInput').value = rt.table_number;
        document.getElementById('tableCapacityInput').value = rt.seating_capacity;
        document.getElementById('tableZoneInput').value = rt.zone;
        document.getElementById('tableStatusInput').value = rt.status;
      }
    }
    openModal('modalTable');
  }
  async function handleTableSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('tableEditId').value;
    const payload = {
      table_number: document.getElementById('tableNumInput').value.trim(),
      seating_capacity: parseInt(document.getElementById('tableCapacityInput').value),
      zone: document.getElementById('tableZoneInput').value,
      status: document.getElementById('tableStatusInput').value
    };
    try {
      if (editId) { await dbUpdate('restaurant_tables', parseInt(editId), payload); showToast(`${t('toast_table_updated')} ${payload.table_number}`); }
      else        { await dbInsert('restaurant_tables', payload); showToast(`${t('toast_table_added')} ${payload.table_number}`); }
      closeModal('modalTable');
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteTable(id) {
    if (!confirm(t('toast_confirm_delete_table'))) return;
    try { await dbDelete('restaurant_tables', id); showToast(t('toast_table_deleted')); await reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  /* ============================================================
     ORDERS / CART
     ============================================================ */
  function addToCart(itemId) {
    const it = db.menu_items.find(m => m.id === itemId);
    if (!it) return;
    const existing = activeCart.find(c => c.id === it.id);
    if (existing) existing.qty++;
    else activeCart.push({ id: it.id, name: it.name, qty: 1, price_etb: Number(it.price_etb) });
    document.getElementById('cartCountBadge').textContent = activeCart.reduce((s, c) => s + c.qty, 0);
    showToast(`${t('toast_cart_added')} — ${it.name}`);
  }
  function removeFromCart(i) {
    activeCart.splice(i, 1);
    document.getElementById('cartCountBadge').textContent = activeCart.reduce((s, c) => s + c.qty, 0);
    openCartModal();
  }
  function openCartModal() {
    const typeSel = document.getElementById('cartTypeInput');
    const targetSel = document.getElementById('cartTargetInput');
    function refreshTargets() {
      targetSel.innerHTML = '';
      if (typeSel.value === 'Room Service') {
        db.rooms.forEach(r => {
          const o = document.createElement('option');
          o.value = `${t('th_room')} ${r.room_number}`;
          o.textContent = `${t('th_room')} ${r.room_number} (${t('rt_' + r.room_type.replace(/\s+/g,''))})`;
          targetSel.appendChild(o);
        });
        if (db.rooms.length === 0) targetSel.innerHTML = '<option value="">—</option>';
      } else {
        db.restaurant_tables.forEach(rt => {
          const o = document.createElement('option');
          o.value = `${t('th_table_num')} ${rt.table_number}`;
          o.textContent = `${t('th_table_num')} ${rt.table_number} — ${t('zone_' + rt.zone.replace(/\s+/g,''))}`;
          targetSel.appendChild(o);
        });
        if (db.restaurant_tables.length === 0) targetSel.innerHTML = '<option value="">—</option>';
      }
    }
    refreshTargets();
    typeSel.onchange = refreshTargets;

    const list = document.getElementById('cartList');
    list.innerHTML = '';
    if (activeCart.length === 0) {
      list.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:0.75rem;padding:1rem 0">${esc(t('cart_empty'))}</div>`;
      document.getElementById('cartTotalSumText').textContent = '0.00 ETB';
    } else {
      let total = 0;
      activeCart.forEach((it, i) => {
        total += it.price_etb * it.qty;
        const d = document.createElement('div');
        d.className = 'cart-row';
        d.innerHTML = `
          <div style="display:flex;gap:0.5rem;align-items:center">
            <span style="color:var(--text-strong);font-weight:600">${esc(it.name)}</span>
            <span style="color:var(--muted)">×${it.qty}</span>
          </div>
          <div style="display:flex;gap:0.75rem;align-items:center">
            <span style="color:var(--amber);font-weight:700">${fmtETB(it.price_etb * it.qty)} ETB</span>
            <button onclick="AsniApp.removeFromCart(${i})" style="background:none;border:none;color:#fda4af;cursor:pointer"><i class="fa-solid fa-trash"></i></button>
          </div>`;
        list.appendChild(d);
      });
      document.getElementById('cartTotalSumText').textContent = `${fmtETB(total)} ETB`;
    }
    openModal('modalCart');
  }
  async function placeOrder() {
    if (activeCart.length === 0) { showToast(t('toast_cart_empty'), 'error'); return; }
    const orderType = document.getElementById('cartTypeInput').value;
    const target = document.getElementById('cartTargetInput').value;
    if (!target) { showToast(t('misc_select_target'), 'error'); return; }
    const total = activeCart.reduce((s, i) => s + i.price_etb * i.qty, 0);
    const items = activeCart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price_etb: i.price_etb }));
    try {
      await dbInsert('orders', {
        order_type: orderType, target_identifier: target,
        items_json: JSON.stringify(items),
        total_amount_etb: total, status: 'Pending'
      });
      activeCart = [];
      document.getElementById('cartCountBadge').textContent = '0';
      closeModal('modalCart');
      showToast(`${t('toast_order_submitted')} ${target}`);
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  function openOrderModal(id) {
    const o = db.orders.find(x => x.id === id);
    if (!o) return;
    document.getElementById('orderEditId').value = o.id;
    document.getElementById('orderTypeInput').value = o.order_type;
    document.getElementById('orderTargetInput').value = o.target_identifier;
    document.getElementById('orderTotalInput').value = o.total_amount_etb;
    document.getElementById('orderStatusInput').value = o.status;
    openModal('modalOrder');
  }
  async function handleOrderSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('orderEditId').value;
    const payload = {
      order_type: document.getElementById('orderTypeInput').value,
      target_identifier: document.getElementById('orderTargetInput').value.trim(),
      total_amount_etb: parseFloat(document.getElementById('orderTotalInput').value),
      status: document.getElementById('orderStatusInput').value
    };
    try {
      await dbUpdate('orders', parseInt(editId), payload);
      closeModal('modalOrder');
      showToast(t('toast_order_updated'));
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteOrder(id) {
    if (!confirm(t('toast_confirm_delete_order'))) return;
    try { await dbDelete('orders', id); showToast(t('toast_order_deleted')); await reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  /* ============================================================
     BANNERS
     ============================================================ */
  function openBannerModal(id = null) {
    document.getElementById('formBanner').reset();
    document.getElementById('bannerEditId').value = id || '';
    document.getElementById('modalBannerTitle').innerHTML = id
      ? `<i class="fa-solid fa-pen text-purple"></i> ${esc(t('modal_banner_edit'))}`
      : `<i class="fa-solid fa-plus text-purple"></i> ${esc(t('modal_banner_new'))}`;
    if (id) {
      const b = db.ad_banners.find(x => x.id === id);
      if (b) {
        document.getElementById('bannerTitleInput').value = b.title;
        document.getElementById('bannerDescInput').value = b.description;
        document.getElementById('bannerTagInput').value = b.tag;
        document.getElementById('bannerColorInput').value = b.badge_color || 'bg-amber-600';
        document.getElementById('bannerActiveInput').checked = Number(b.active) === 1;
      }
    } else {
      document.getElementById('bannerActiveInput').checked = true;
    }
    openModal('modalBanner');
  }
  async function handleBannerSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('bannerEditId').value;
    const payload = {
      title: document.getElementById('bannerTitleInput').value.trim(),
      description: document.getElementById('bannerDescInput').value.trim(),
      tag: document.getElementById('bannerTagInput').value.trim(),
      badge_color: document.getElementById('bannerColorInput').value,
      active: document.getElementById('bannerActiveInput').checked ? 1 : 0
    };
    try {
      if (editId) { await dbUpdate('ad_banners', parseInt(editId), payload); showToast(t('toast_banner_updated')); }
      else        { await dbInsert('ad_banners', payload); showToast(t('toast_banner_added')); }
      closeModal('modalBanner');
      await reload();
    } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteBanner(id) {
    if (!confirm(t('toast_confirm_delete_banner'))) return;
    try { await dbDelete('ad_banners', id); showToast(t('toast_banner_deleted')); await reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  /* ============================================================
     RECEIPT + CSV + SQL
     ============================================================ */
  function printReceipt(payer, desc, amount) {
    document.getElementById('rcptId').textContent = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('rcptDate').textContent = new Date().toLocaleDateString(currentLang === 'am' ? 'am' : 'en-US');
    document.getElementById('rcptPayer').textContent = payer;
    document.getElementById('rcptType').textContent = t('rcpt_completed');
    document.getElementById('rcptDesc').textContent = desc;
    document.getElementById('rcptAmount').textContent = `${fmtETB(amount)} ETB`;
    openModal('modalReceipt');
  }
  function exportCSV() {
    const rows = computeLedger();
    let csv = 'Ref,Date,Type,Description,Payer_Or_Target,Amount_ETB\n';
    rows.forEach(r => {
      const clean = s => String(s).replace(/"/g, '""');
      csv += `${r.ref},${r.date},${r.type},"${clean(r.desc)}","${clean(r.payer)}",${r.amount}\n`;
    });
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `Asni_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    showToast(t('toast_exported'));
  }
  async function runDirectSQL() {
    const q = document.getElementById('sqlQueryInput').value.trim();
    const out = document.getElementById('sqlOutputBox');
    const t0 = performance.now();
    if (!q) { out.innerHTML = `<span style="color:#fda4af">${esc(t('misc_enter_sql'))}</span>`; return; }
    try {
      if (!onlineMode) throw new Error(t('misc_offline_sql'));
      const res = await apiQuery(q);
      out.textContent = JSON.stringify(res.results || res.meta || {}, null, 2);
      document.getElementById('sqlExecDuration').textContent = `Execution time: ${(performance.now() - t0).toFixed(2)}ms`;
      await reload();
    } catch (e) {
      out.innerHTML = `<span style="color:#fda4af">Error: ${esc(e.message)}</span>`;
    }
  }

  /* ============================================================
     EVENT BINDINGS
     ============================================================ */
  function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const id = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-page').forEach(p => p.classList.add('hidden'));
        const el = document.getElementById(`tab-${id}`);
        if (el) el.classList.remove('hidden');
        if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('is-open');
      });
    });

    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      const btn = document.getElementById('mobileMenuBtn');
      if (window.innerWidth < 768 && sidebar.classList.contains('is-open')
          && !sidebar.contains(e.target) && !btn.contains(e.target)) {
        sidebar.classList.remove('is-open');
      }
    });

    document.getElementById('roleSelect').addEventListener('change', e => setRole(e.target.value));
    document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);
    document.getElementById('btnLangToggle').addEventListener('click', () => {
      applyLang(currentLang === 'en' ? 'am' : 'en');
    });

    document.getElementById('btnRefreshD1').addEventListener('click', async () => {
      showToast(t('toast_refresh_start'));
      await reload();
      showToast(t('toast_refresh_done'));
    });

    document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', closeAllModals));
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m) closeAllModals(); });
    });
    document.getElementById('btnCloseReceipt').addEventListener('click', () => closeModal('modalReceipt'));
    document.getElementById('btnPrintReceipt').addEventListener('click', () => window.print());

    document.getElementById('btnCreateRoom').addEventListener('click', () => openRoomModal());
    document.getElementById('formRoom').addEventListener('submit', handleRoomSubmit);
    document.getElementById('btnCreateUser').addEventListener('click', () => openUserModal());
    document.getElementById('formUser').addEventListener('submit', handleUserSubmit);
    document.getElementById('btnCreateBooking').addEventListener('click', () => openBookingModal());
    document.getElementById('formBooking').addEventListener('submit', handleBookingSubmit);
    document.getElementById('btnCreateMenuItem').addEventListener('click', () => openMenuModal());
    document.getElementById('formMenu').addEventListener('submit', handleMenuSubmit);
    document.getElementById('btnCreateTable').addEventListener('click', () => openTableModal());
    document.getElementById('formTable').addEventListener('submit', handleTableSubmit);
    document.getElementById('formOrder').addEventListener('submit', handleOrderSubmit);
    document.getElementById('btnCreateBanner').addEventListener('click', () => openBannerModal());
    document.getElementById('formBanner').addEventListener('submit', handleBannerSubmit);

    document.getElementById('bookingRoomSelect').addEventListener('change', autoFillBookingTotal);
    document.getElementById('bookingCheckinInput').addEventListener('change', autoFillBookingTotal);
    document.getElementById('bookingCheckoutInput').addEventListener('change', autoFillBookingTotal);

    document.getElementById('btnOpenCartModal').addEventListener('click', openCartModal);
    document.getElementById('btnClearCart').addEventListener('click', () => {
      activeCart = [];
      document.getElementById('cartCountBadge').textContent = '0';
      openCartModal();
    });
    document.getElementById('btnPlaceOrder').addEventListener('click', placeOrder);

    document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
    document.getElementById('btnExecuteSQL').addEventListener('click', runDirectSQL);

    document.getElementById('btnResetSeed').addEventListener('click', async () => {
      if (!confirm(t('toast_confirm_reset'))) return;
      if (!onlineMode) { showToast(t('toast_d1_required'), 'error'); return; }
      const DDL = [
        `PRAGMA foreign_keys = OFF`,
        `DROP TABLE IF EXISTS users`,
        `DROP TABLE IF EXISTS rooms`,
        `DROP TABLE IF EXISTS bookings`,
        `DROP TABLE IF EXISTS restaurant_tables`,
        `DROP TABLE IF EXISTS menu_items`,
        `DROP TABLE IF EXISTS orders`,
        `DROP TABLE IF EXISTS ad_banners`,
        `CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT, role TEXT CHECK(role IN ('admin','receptionist','guest')) NOT NULL DEFAULT 'guest', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, room_number TEXT UNIQUE NOT NULL, room_type TEXT CHECK(room_type IN ('Standard','Deluxe','Executive Suite','Family Suite')) NOT NULL, price_per_night_etb REAL NOT NULL, capacity INTEGER NOT NULL DEFAULT 2, status TEXT CHECK(status IN ('Available','Occupied','Cleaning','Maintenance')) NOT NULL DEFAULT 'Available', description TEXT)`,
        `CREATE TABLE bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, guest_name TEXT NOT NULL, guest_phone TEXT NOT NULL, check_in_date DATE NOT NULL, check_out_date DATE NOT NULL, total_amount_etb REAL NOT NULL, status TEXT CHECK(status IN ('Pending','Confirmed','CheckedIn','CheckedOut','Cancelled')) NOT NULL DEFAULT 'Confirmed', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE)`,
        `CREATE TABLE restaurant_tables (id INTEGER PRIMARY KEY AUTOINCREMENT, table_number TEXT UNIQUE NOT NULL, seating_capacity INTEGER NOT NULL, zone TEXT CHECK(zone IN ('Indoor Main','Garden Patio','Rooftop Lounge')) NOT NULL, status TEXT CHECK(status IN ('Available','Reserved','Occupied')) DEFAULT 'Available')`,
        `CREATE TABLE menu_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT CHECK(category IN ('Traditional Ethiopian','Breakfast','Main Course','Beverages','Dessert')) NOT NULL, price_etb REAL NOT NULL, available INTEGER NOT NULL DEFAULT 1, description TEXT)`,
        `CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_type TEXT CHECK(order_type IN ('Room Service','Restaurant Table')) NOT NULL, target_identifier TEXT NOT NULL, items_json TEXT NOT NULL, total_amount_etb REAL NOT NULL, status TEXT CHECK(status IN ('Pending','Preparing','Served','Cancelled')) DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE ad_banners (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, tag TEXT NOT NULL, badge_color TEXT DEFAULT 'bg-amber-600', active INTEGER NOT NULL DEFAULT 1)`,
        `PRAGMA foreign_keys = ON`
      ];
      try {
        for (const sql of DDL) await apiQuery(sql);
        showToast(t('toast_reset_done'));
        await reload();
      } catch (err) { showToast(err.message, 'error'); }
    });

    document.getElementById('btnSaveWorkerUrl').addEventListener('click', async () => {
      const url = document.getElementById('workerUrlInput').value.trim().replace(/\/$/, '');
      if (!url) { showToast(t('misc_enter_url'), 'error'); return; }
      localStorage.setItem(KEYS.worker, url);
      apiBase = url;
      showToast('Reconnecting…');
      await boot();
    });
    document.getElementById('btnTestWorker').addEventListener('click', async () => {
      const url = document.getElementById('workerUrlInput').value.trim().replace(/\/$/, '');
      const status = document.getElementById('workerStatusText');
      try {
        const r = await fetch(url + '/api/health');
        const j = await r.json();
        status.textContent = `✓ ${r.status} — ${j.app || 'worker online'}`;
        showToast(t('toast_worker_online'));
      } catch (e) {
        status.textContent = `⚠ ${e.message}`;
        showToast(t('toast_worker_failed'), 'error');
      }
    });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
  }

  /* ============================================================
     PUBLIC
     ============================================================ */
  return {
    init: function () {
      setupEventListeners();

      // Restore preferences
      const savedRole = localStorage.getItem(KEYS.role) || 'Admin';
      document.getElementById('roleSelect').value = savedRole;

      applyTheme(currentTheme);
      applyLang(currentLang, true);   // silent to avoid double toast on boot
      setRole(savedRole);
      boot();
    },
    openRoomModal, deleteRoom,
    openUserModal, deleteUser,
    openBookingModal, deleteBooking,
    openMenuModal, deleteMenuItem,
    openTableModal, deleteTable,
    openOrderModal, deleteOrder,
    openBannerModal, deleteBanner,
    addToCart, removeFromCart,
    printReceipt
  };
})();

window.addEventListener('DOMContentLoaded', () => AsniApp.init());