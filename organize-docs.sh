#!/bin/bash

# Script to organize markdown documentation files into proper folders

echo "Organizing documentation files..."

# Move SendTusk docs (already done, but ensure)
mv SENDTUSK_*.md docs/sendtusk/ 2>/dev/null || true

# Move Admin-related docs
mv ADMIN_*.md docs/admin/ 2>/dev/null || true

# Move Testing-related docs
mv *TEST*.md docs/testing/ 2>/dev/null || true
mv *TESTING*.md docs/testing/ 2>/dev/null || true

# Move Fix/Issue-related docs
mv *FIX*.md docs/fixes/ 2>/dev/null || true
mv *ISSUE*.md docs/fixes/ 2>/dev/null || true
mv *ERROR*.md docs/fixes/ 2>/dev/null || true
mv *BUG*.md docs/fixes/ 2>/dev/null || true

# Move Feature-related docs
mv *FEATURE*.md docs/features/ 2>/dev/null || true
mv *IMPLEMENTATION*.md docs/features/ 2>/dev/null || true
mv CORPORATE_*.md docs/features/ 2>/dev/null || true
mv *WORKFLOW*.md docs/features/ 2>/dev/null || true

# Move Guide-related docs
mv *GUIDE*.md docs/guides/ 2>/dev/null || true
mv *DOCUMENTATION*.md docs/guides/ 2>/dev/null || true
mv *SETUP*.md docs/guides/ 2>/dev/null || true
mv *SUMMARY*.md docs/guides/ 2>/dev/null || true

# Move SignTusk-specific docs
mv SIGNATURE_*.md docs/signtusk/ 2>/dev/null || true
mv SIGNING_*.md docs/signtusk/ 2>/dev/null || true
mv SIGNER_*.md docs/signtusk/ 2>/dev/null || true
mv TOTP_*.md docs/signtusk/ 2>/dev/null || true
mv QR_*.md docs/signtusk/ 2>/dev/null || true
mv DOCUMENT_*.md docs/signtusk/ 2>/dev/null || true
mv PDF_*.md docs/signtusk/ 2>/dev/null || true

# Move general/strategy docs
mv *STRATEGY*.md docs/general/ 2>/dev/null || true
mv *COMPARISON*.md docs/general/ 2>/dev/null || true
mv *ANALYSIS*.md docs/general/ 2>/dev/null || true
mv README*.md docs/general/ 2>/dev/null || true

# Keep main README in root
mv docs/general/README.md . 2>/dev/null || true

echo "Organization complete!"
echo ""
echo "Documentation structure:"
tree -L 2 docs/ 2>/dev/null || find docs/ -type d -maxdepth 2

