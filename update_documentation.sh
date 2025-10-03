#!/bin/bash

# Script to update all documentation files with new terminology
# Personal → Individual
# Corporate → Enterprise

echo "🔄 Starting documentation update..."
echo ""

# List of documentation files to update
files=(
  "COMPREHENSIVE_TEST_CASES.md"
  "COMPREHENSIVE_TEST_CASES_PART2.md"
  "PHASE_3_ACCESS_CONTROL_MODES.md"
  "PHASE_4_INVITATION_SYSTEM.md"
  "PHASE_5_USER_MANAGEMENT.md"
  "PHASE_6_FINAL_IMPLEMENTATION.md"
  "APPROVAL_MODE_COMPLETE.md"
  "PROJECT_COMPLETE_SUMMARY.md"
  "FINAL_PROJECT_SUMMARY.md"
  "EMAIL_VERIFICATION_FLOW.md"
)

# Create backup directory
backup_dir="documentation_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"
echo "📁 Created backup directory: $backup_dir"
echo ""

# Function to update a file
update_file() {
  local file=$1
  
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file (skipping)"
    return
  fi
  
  echo "📝 Updating: $file"
  
  # Create backup
  cp "$file" "$backup_dir/"
  
  # Perform replacements
  sed -i.bak \
    -e 's/Personal Account/Individual Account/g' \
    -e 's/personal account/individual account/g' \
    -e 's/Corporate Account/Enterprise Account/g' \
    -e 's/corporate account/enterprise account/g' \
    -e 's/Personal User/Individual User/g' \
    -e 's/personal user/individual user/g' \
    -e 's/Corporate User/Enterprise User/g' \
    -e 's/corporate user/enterprise user/g' \
    -e "s/account_type: 'personal'/account_type: 'individual'/g" \
    -e 's/account_type: "personal"/account_type: "individual"/g' \
    -e "s/account_type: 'corporate'/account_type: 'enterprise'/g" \
    -e 's/account_type: "corporate"/account_type: "enterprise"/g' \
    -e 's/Personal Signup/Individual Signup/g' \
    -e 's/personal signup/individual signup/g' \
    -e 's/Corporate Signup/Enterprise Signup/g' \
    -e 's/corporate signup/enterprise signup/g' \
    -e 's/Personal Flow/Individual Flow/g' \
    -e 's/personal flow/individual flow/g' \
    -e 's/Corporate Flow/Enterprise Flow/g' \
    -e 's/corporate flow/enterprise flow/g' \
    -e 's/Personal Email/Individual Email/g' \
    -e 's/personal email/individual email/g' \
    -e 's/Corporate Email/Enterprise Email/g' \
    -e 's/corporate email/enterprise email/g' \
    -e 's/personal domain/individual domain/g' \
    -e 's/Personal domain/Individual domain/g' \
    -e 's/corporate domain/enterprise domain/g' \
    -e 's/Corporate domain/Enterprise domain/g' \
    "$file"
  
  # Remove backup file created by sed
  rm -f "${file}.bak"
  
  echo "   ✅ Updated successfully"
}

# Update all files
for file in "${files[@]}"; do
  update_file "$file"
done

echo ""
echo "✅ Documentation update complete!"
echo ""
echo "📊 Summary:"
echo "   - Files updated: ${#files[@]}"
echo "   - Backup location: $backup_dir"
echo ""
echo "🔍 To verify changes, run:"
echo "   git diff"
echo ""
echo "🔄 To rollback, run:"
echo "   cp $backup_dir/* ."
echo ""

