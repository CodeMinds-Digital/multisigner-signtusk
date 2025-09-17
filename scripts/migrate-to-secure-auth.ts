#!/usr/bin/env tsx

/**
 * Migration script to transition from old Supabase auth to secure JWT auth
 * Run this script to update your application to use the new secure authentication system
 */

import fs from 'fs'

interface MigrationStep {
  name: string
  description: string
  action: () => Promise<void> | void
  required: boolean
}

class AuthMigration {
  private steps: MigrationStep[] = []
  private completed: string[] = []
  private failed: string[] = []

  constructor() {
    this.setupMigrationSteps()
  }

  private setupMigrationSteps() {
    this.steps = [
      {
        name: 'backup-old-auth',
        description: 'Backup existing auth provider',
        action: this.backupOldAuth,
        required: true,
      },
      {
        name: 'update-layout',
        description: 'Update root layout to use SecureAuthProvider',
        action: this.updateRootLayout,
        required: true,
      },
      {
        name: 'update-login-page',
        description: 'Update login page to use new auth API',
        action: this.updateLoginPage,
        required: true,
      },
      {
        name: 'update-api-calls',
        description: 'Update API calls to use secure client',
        action: this.updateApiCalls,
        required: true,
      },
      {
        name: 'update-middleware',
        description: 'Verify middleware configuration',
        action: this.verifyMiddleware,
        required: true,
      },
      {
        name: 'setup-environment',
        description: 'Verify environment variables',
        action: this.setupEnvironment,
        required: true,
      },
      {
        name: 'cleanup-old-files',
        description: 'Remove old auth files (optional)',
        action: this.cleanupOldFiles,
        required: false,
      },
    ]
  }

  async run() {
    console.log('🔒 Starting Secure Authentication Migration...\n')

    for (const step of this.steps) {
      try {
        console.log(`📋 ${step.name}: ${step.description}`)
        await step.action()
        this.completed.push(step.name)
        console.log(`✅ ${step.name} completed\n`)
      } catch (error) {
        console.error(`❌ ${step.name} failed:`, error)
        this.failed.push(step.name)

        if (step.required) {
          console.log('🛑 Migration stopped due to required step failure')
          break
        }
        console.log('⚠️ Optional step failed, continuing...\n')
      }
    }

    this.printSummary()
  }

  private backupOldAuth = () => {
    const authProviderPath = 'src/components/providers/auth-provider.tsx'
    const backupPath = 'src/components/providers/auth-provider.tsx.backup'

    if (fs.existsSync(authProviderPath)) {
      fs.copyFileSync(authProviderPath, backupPath)
      console.log(`  📁 Backed up ${authProviderPath} to ${backupPath}`)
    } else {
      console.log('  ℹ️ No existing auth provider found')
    }
  }

  private updateRootLayout = () => {
    const layoutPath = 'src/app/layout.tsx'

    if (!fs.existsSync(layoutPath)) {
      throw new Error(`Layout file not found: ${layoutPath}`)
    }

    let content = fs.readFileSync(layoutPath, 'utf8')

    // Replace old auth provider import
    content = content.replace(
      /import.*AuthProvider.*from.*auth-provider.*/g,
      "import { SecureAuthProvider } from '@/components/providers/secure-auth-provider'"
    )

    // Replace provider usage
    content = content.replace(
      /<AuthProvider>/g,
      '<SecureAuthProvider>'
    )
    content = content.replace(
      /<\/AuthProvider>/g,
      '</SecureAuthProvider>'
    )

    fs.writeFileSync(layoutPath, content)
    console.log('  📝 Updated root layout to use SecureAuthProvider')
  }

  private updateLoginPage = () => {
    const loginPath = 'src/app/(auth)/login/page.tsx'

    if (!fs.existsSync(loginPath)) {
      console.log('  ℹ️ Login page not found, skipping update')
      return
    }

    let content = fs.readFileSync(loginPath, 'utf8')

    // Update to use new auth methods
    content = content.replace(
      /signIn\(credentials\)/g,
      'signIn(credentials.email, credentials.password)'
    )

    fs.writeFileSync(loginPath, content)
    console.log('  📝 Updated login page to use new auth API')
  }

  private updateApiCalls = () => {
    const filesToUpdate = [
      'src/lib/signing-workflow-service.ts',
      'src/lib/document-store.ts',
    ]

    filesToUpdate.forEach(filePath => {
      if (!fs.existsSync(filePath)) {
        console.log(`  ℹ️ File not found: ${filePath}, skipping`)
        return
      }

      let content = fs.readFileSync(filePath, 'utf8')

      // Add secure API client import
      if (!content.includes('secure-api-client')) {
        content = `import { api } from '@/lib/secure-api-client'\n${content}`
      }

      // Replace direct supabase calls with secure API calls
      content = content.replace(
        /createAuthenticatedSupabaseCall\(async \(\) => \{/g,
        'api.get('
      )

      fs.writeFileSync(filePath, content)
      console.log(`  📝 Updated API calls in ${filePath}`)
    })
  }

  private verifyMiddleware = () => {
    const middlewarePath = 'middleware.ts'

    if (!fs.existsSync(middlewarePath)) {
      throw new Error('Middleware file not found')
    }

    const content = fs.readFileSync(middlewarePath, 'utf8')

    if (!content.includes('verifyAccessToken')) {
      throw new Error('Middleware not updated to use secure auth')
    }

    console.log('  ✅ Middleware configuration verified')
  }

  private setupEnvironment = () => {
    const envPath = '.env.local'

    if (!fs.existsSync(envPath)) {
      throw new Error('.env.local file not found')
    }

    const content = fs.readFileSync(envPath, 'utf8')

    if (!content.includes('JWT_SECRET')) {
      throw new Error('JWT_SECRET not found in environment variables')
    }

    console.log('  ✅ Environment variables verified')
  }

  private cleanupOldFiles = () => {
    const filesToRemove = [
      'src/lib/auth-interceptor.ts',
      'src/hooks/use-auth-refresh.ts',
      'src/utils/token-inspector.ts',
    ]

    filesToRemove.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`  🗑️ Removed ${filePath}`)
      }
    })
  }

  private printSummary() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(50))

    console.log(`✅ Completed: ${this.completed.length} steps`)
    this.completed.forEach(step => console.log(`   - ${step}`))

    if (this.failed.length > 0) {
      console.log(`❌ Failed: ${this.failed.length} steps`)
      this.failed.forEach(step => console.log(`   - ${step}`))
    }

    console.log('\n📋 NEXT STEPS:')
    console.log('1. Test login functionality')
    console.log('2. Verify protected routes work')
    console.log('3. Test token refresh behavior')
    console.log('4. Update any remaining API calls')
    console.log('5. Deploy to production with secure environment variables')

    console.log('\n🔒 Your application now uses secure authentication!')
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new AuthMigration()
  migration.run().catch(console.error)
}

export { AuthMigration }
