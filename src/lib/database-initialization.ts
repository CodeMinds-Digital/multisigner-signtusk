import { supabase } from './supabase'

export class DatabaseInitialization {
  /**
   * Initialize default document types
   */
  static async initializeDocumentTypes(): Promise<void> {
    try {
      console.log('Initializing document types...')

      const defaultTypes = [
        { name: 'Contract', description: 'Legal contracts and agreements', color: '#3B82F6', icon: '📄', is_system: true },
        { name: 'Agreement', description: 'General agreements', color: '#10B981', icon: '🤝', is_system: true },
        { name: 'NDA', description: 'Non-disclosure agreements', color: '#F59E0B', icon: '🔒', is_system: true },
        { name: 'Invoice', description: 'Financial invoices', color: '#EF4444', icon: '💰', is_system: true },
        { name: 'Form', description: 'General forms', color: '#8B5CF6', icon: '📋', is_system: true },
        { name: 'Letter', description: 'Official letters', color: '#06B6D4', icon: '✉️', is_system: true },
        { name: 'Certificate', description: 'Certificates and credentials', color: '#F97316', icon: '🏆', is_system: true },
        { name: 'Report', description: 'Reports and documentation', color: '#84CC16', icon: '📊', is_system: true },
        { name: 'Other', description: 'Other document types', color: '#6B7280', icon: '📄', is_system: true }
      ]

      for (const type of defaultTypes) {
        // Check if type already exists
        const { data: existing } = await supabase
          .from('document_types')
          .select('id')
          .eq('name', type.name)
          .eq('is_system', true)
          .single()

        if (!existing) {
          const { error } = await supabase
            .from('document_types')
            .insert([type])

          if (error) {
            console.error(`Error inserting document type ${type.name}:`, error)
          } else {
            console.log(`✓ Created document type: ${type.name}`)
          }
        } else {
          console.log(`✓ Document type already exists: ${type.name}`)
        }
      }

      console.log('Document types initialization completed')
    } catch (error) {
      console.error('Error initializing document types:', error)
    }
  }

  /**
   * Initialize default document categories
   */
  static async initializeDocumentCategories(): Promise<void> {
    try {
      console.log('Initializing document categories...')

      const defaultCategories = [
        { name: 'Legal', description: 'Legal documents and contracts', color: '#3B82F6', icon: '⚖️', is_system: true },
        { name: 'HR', description: 'Human resources documents', color: '#10B981', icon: '👥', is_system: true },
        { name: 'Finance', description: 'Financial documents', color: '#F59E0B', icon: '💰', is_system: true },
        { name: 'Sales', description: 'Sales and marketing documents', color: '#EF4444', icon: '📈', is_system: true },
        { name: 'Operations', description: 'Operational documents', color: '#8B5CF6', icon: '⚙️', is_system: true },
        { name: 'Compliance', description: 'Compliance and regulatory documents', color: '#06B6D4', icon: '✅', is_system: true },
        { name: 'IT', description: 'Information technology documents', color: '#F97316', icon: '💻', is_system: true },
        { name: 'Personal', description: 'Personal documents', color: '#84CC16', icon: '👤', is_system: true },
        { name: 'Other', description: 'Other categories', color: '#6B7280', icon: '📁', is_system: true }
      ]

      for (const category of defaultCategories) {
        // Check if category already exists
        const { data: existing } = await supabase
          .from('document_categories')
          .select('id')
          .eq('name', category.name)
          .eq('is_system', true)
          .single()

        if (!existing) {
          const { error } = await supabase
            .from('document_categories')
            .insert([category])

          if (error) {
            console.error(`Error inserting document category ${category.name}:`, error)
          } else {
            console.log(`✓ Created document category: ${category.name}`)
          }
        } else {
          console.log(`✓ Document category already exists: ${category.name}`)
        }
      }

      console.log('Document categories initialization completed')
    } catch (error) {
      console.error('Error initializing document categories:', error)
    }
  }

  /**
   * Check if required tables exist
   */
  static async checkTablesExist(): Promise<{ [key: string]: boolean }> {
    const tables = [
      'document_templates',
      'document_types',
      'document_categories',
      'signing_requests',
      'signing_request_signers',
      'notifications',
      'notification_preferences'
    ]

    const results: { [key: string]: boolean } = {}

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true })
          .limit(1)

        results[table] = !error
        if (error) {
          console.warn(`Table ${table} does not exist or is not accessible:`, error.message)
        } else {
          console.log(`✓ Table ${table} exists`)
        }
      } catch (error) {
        results[table] = false
        console.warn(`Table ${table} check failed:`, error)
      }
    }

    return results
  }

  /**
   * Initialize database functions
   */
  static async initializeDatabaseFunctions(): Promise<void> {
    try {
      console.log('Initializing database functions...')

      // Note: In a real application, you would execute the SQL functions here
      // For now, we'll just log that they should be created manually
      console.log('⚠️ Database functions need to be created manually in Supabase SQL editor')
      console.log('📄 SQL file available at: src/lib/database-functions.sql')

      // Test if functions exist by trying to call one
      try {
        const { error } = await supabase.rpc('can_delete_document_type', {
          type_name: 'test',
          user_id_param: '00000000-0000-0000-0000-000000000000'
        })

        if (!error) {
          console.log('✅ Database functions are available')
        }
      } catch {
        console.warn('⚠️ Database functions not found - please run the SQL in database-functions.sql')
      }

    } catch (error) {
      console.error('Error checking database functions:', error)
    }
  }

  /**
   * Initialize all default data
   */
  static async initializeAll(): Promise<void> {
    console.log('🚀 Starting database initialization...')

    // Check tables first
    const tableStatus = await this.checkTablesExist()

    // Initialize database functions
    await this.initializeDatabaseFunctions()

    // Initialize document types if table exists
    if (tableStatus.document_types) {
      await this.initializeDocumentTypes()
    } else {
      console.warn('⚠️ document_types table not found, skipping initialization')
    }

    // Initialize document categories if table exists
    if (tableStatus.document_categories) {
      await this.initializeDocumentCategories()
    } else {
      console.warn('⚠️ document_categories table not found, skipping initialization')
    }

    console.log('✅ Database initialization completed')
  }

  /**
   * Create missing tables (SQL commands for reference)
   */
  static getCreateTableSQL(): string {
    return `
-- Document Types Table
CREATE TABLE IF NOT EXISTS document_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(10) DEFAULT '📄',
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id),
  UNIQUE(name) WHERE is_system = true
);

-- Document Categories Table
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(10) DEFAULT '📁',
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id),
  UNIQUE(name) WHERE is_system = true
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  signature_requests BOOLEAN DEFAULT true,
  document_updates BOOLEAN DEFAULT true,
  reminders BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_types_user_id ON document_types(user_id);
CREATE INDEX IF NOT EXISTS idx_document_types_is_system ON document_types(is_system);
CREATE INDEX IF NOT EXISTS idx_document_categories_user_id ON document_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_is_system ON document_categories(is_system);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view system and own document types" ON document_types
  FOR SELECT USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own document types" ON document_types
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own document types" ON document_types
  FOR UPDATE USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own document types" ON document_types
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Similar policies for categories
CREATE POLICY "Users can view system and own categories" ON document_categories
  FOR SELECT USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own categories" ON document_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own categories" ON document_categories
  FOR UPDATE USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own categories" ON document_categories
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Notification policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
    `
  }
}
