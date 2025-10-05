-- Send Tab: Team Collaboration & Advanced Features
-- Migration: 20250105_send_team_collaboration.sql

-- ============================================================================
-- TEAMS & COLLABORATION
-- ============================================================================

-- Teams table
CREATE TABLE IF NOT EXISTS send_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS send_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES send_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations table
CREATE TABLE IF NOT EXISTS send_team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES send_teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DATA ROOMS
-- ============================================================================

-- Data rooms table
CREATE TABLE IF NOT EXISTS send_data_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES send_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Data room documents table
CREATE TABLE IF NOT EXISTS send_data_room_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES send_data_rooms(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES send_documents(id) ON DELETE CASCADE,
  folder_path TEXT DEFAULT '/',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_room_id, document_id)
);

-- Data room access table
CREATE TABLE IF NOT EXISTS send_data_room_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES send_data_rooms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  permissions JSONB DEFAULT '{"can_view": true, "can_download": false}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_room_id, email)
);

-- ============================================================================
-- DOCUMENT VERSIONING
-- ============================================================================

-- Document versions table
CREATE TABLE IF NOT EXISTS send_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES send_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  change_notes TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

-- ============================================================================
-- FEEDBACK & COLLABORATION
-- ============================================================================

-- Document feedback table (enhanced)
CREATE TABLE IF NOT EXISTS send_document_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES send_document_links(id) ON DELETE CASCADE,
  session_id UUID REFERENCES send_visitor_sessions(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  feedback_type TEXT CHECK (feedback_type IN ('rating', 'comment', 'survey')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team comments table
CREATE TABLE IF NOT EXISTS send_team_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES send_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES send_team_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]',
  page_number INTEGER,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SCHEDULED SHARING
-- ============================================================================

-- Scheduled links table
CREATE TABLE IF NOT EXISTS send_scheduled_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES send_document_links(id) ON DELETE CASCADE,
  activate_at TIMESTAMPTZ NOT NULL,
  deactivate_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  activated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QR CODES
-- ============================================================================

-- QR codes table
CREATE TABLE IF NOT EXISTS send_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES send_document_links(id) ON DELETE CASCADE,
  qr_code_url TEXT NOT NULL,
  scan_count INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR code scans table
CREATE TABLE IF NOT EXISTS send_qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES send_qr_codes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  location JSONB
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_send_teams_owner ON send_teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_send_teams_slug ON send_teams(slug);
CREATE INDEX IF NOT EXISTS idx_send_team_members_team ON send_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_send_team_members_user ON send_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_send_team_invitations_team ON send_team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_send_team_invitations_email ON send_team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_send_data_rooms_team ON send_data_rooms(team_id);
CREATE INDEX IF NOT EXISTS idx_send_data_rooms_user ON send_data_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_send_data_room_documents_room ON send_data_room_documents(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_data_room_access_room ON send_data_room_access(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_document_versions_document ON send_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_send_team_comments_document ON send_team_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_send_team_comments_user ON send_team_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_send_scheduled_links_link ON send_scheduled_links(link_id);
CREATE INDEX IF NOT EXISTS idx_send_qr_codes_link ON send_qr_codes(link_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE send_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_data_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_data_room_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_data_room_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_document_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_team_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_scheduled_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_qr_scans ENABLE ROW LEVEL SECURITY;

-- Teams: Users can view teams they own or are members of
CREATE POLICY "Users can view their teams" ON send_teams
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT team_id FROM send_team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create teams" ON send_teams
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams" ON send_teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete teams" ON send_teams
  FOR DELETE USING (owner_id = auth.uid());

-- Team members: Users can view members of their teams
CREATE POLICY "Users can view team members" ON send_team_members
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM send_teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM send_team_members WHERE user_id = auth.uid()
    )
  );

-- Data rooms: Users can view their own data rooms or team data rooms
CREATE POLICY "Users can view data rooms" ON send_data_rooms
  FOR SELECT USING (
    user_id = auth.uid() OR
    team_id IN (SELECT team_id FROM send_team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create data rooms" ON send_data_rooms
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their data rooms" ON send_data_rooms
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their data rooms" ON send_data_rooms
  FOR DELETE USING (user_id = auth.uid());

-- Document versions: Users can view versions of their documents
CREATE POLICY "Users can view document versions" ON send_document_versions
  FOR SELECT USING (
    document_id IN (SELECT id FROM send_documents WHERE user_id = auth.uid())
  );

-- Team comments: Users can view comments on their documents
CREATE POLICY "Users can view team comments" ON send_team_comments
  FOR SELECT USING (
    document_id IN (SELECT id FROM send_documents WHERE user_id = auth.uid()) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can create team comments" ON send_team_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_send_teams_updated_at
  BEFORE UPDATE ON send_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_send_team_members_updated_at
  BEFORE UPDATE ON send_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_send_data_rooms_updated_at
  BEFORE UPDATE ON send_data_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_send_data_room_documents_updated_at
  BEFORE UPDATE ON send_data_room_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_send_team_comments_updated_at
  BEFORE UPDATE ON send_team_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

