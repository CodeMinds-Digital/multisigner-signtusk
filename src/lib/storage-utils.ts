import { supabase } from './supabase'

export async function testStorageConnection() {
  try {
    console.log('Testing Supabase storage connection...')

    // Test 1: List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return { success: false, error: bucketsError.message }
    }

    console.log('Available buckets:', buckets?.map((b: any) => b.name))

    // Test 2: Try to create a test file in each bucket
    const testFile = new Blob(['test content'], { type: 'text/plain' })
    const testFileName = `test-${Date.now()}.txt`

    for (const bucket of buckets || []) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket.name)
          .upload(testFileName, testFile)

        if (!error) {
          console.log(`✅ Successfully uploaded to ${bucket.name}`)

          // Clean up test file
          await supabase.storage
            .from(bucket.name)
            .remove([testFileName])

          return {
            success: true,
            workingBucket: bucket.name,
            message: `Storage is working with bucket: ${bucket.name}`
          }
        } else {
          console.log(`❌ Failed to upload to ${bucket.name}:`, error.message)
        }
      } catch (err) {
        console.log(`❌ Error testing ${bucket.name}:`, err)
      }
    }

    return {
      success: false,
      error: 'No working storage buckets found. Please create a storage bucket in Supabase.'
    }

  } catch (error: any) {
    console.error('Storage test failed:', error)
    return { success: false, error: error.message }
  }
}

export async function createDefaultBuckets() {
  try {
    console.log('Creating default storage buckets...')

    const bucketsToCreate = [
      { name: 'documents', public: true },
      { name: 'signatures', public: true },
      { name: 'files', public: true }
    ]

    const results = []

    for (const bucketConfig of bucketsToCreate) {
      const { data, error } = await supabase.storage.createBucket(
        bucketConfig.name,
        { public: bucketConfig.public }
      )

      if (error) {
        console.log(`Bucket ${bucketConfig.name} might already exist:`, error.message)
        results.push({ bucket: bucketConfig.name, status: 'exists_or_error', error: error.message })
      } else {
        console.log(`✅ Created bucket: ${bucketConfig.name}`)
        results.push({ bucket: bucketConfig.name, status: 'created' })
      }
    }

    return { success: true, results }

  } catch (error: any) {
    console.error('Failed to create buckets:', error)
    return { success: false, error: error.message }
  }
}

export async function testDatabaseConnection() {
  try {
    console.log('Testing Supabase database connection...')

    // Test basic connection
    const { data, error } = await supabase
      .from('auth.users')
      .select('count')
      .limit(1)

    if (error) {
      console.log('Database connection test result:', error.message)
      return {
        success: false,
        error: error.message,
        suggestion: 'This is normal if you don\'t have access to auth.users table'
      }
    }

    return { success: true, message: 'Database connection is working' }

  } catch (error: any) {
    console.error('Database test failed:', error)
    return { success: false, error: error.message }
  }
}

// Helper function to run all tests
export async function runStorageTests() {
  console.log('🧪 Running storage and database tests...')

  const dbTest = await testDatabaseConnection()
  console.log('Database test:', dbTest)

  const storageTest = await testStorageConnection()
  console.log('Storage test:', storageTest)

  if (!storageTest.success) {
    console.log('Attempting to create default buckets...')
    const createResult = await createDefaultBuckets()
    console.log('Bucket creation result:', createResult)

    // Test again after creating buckets
    const retestStorage = await testStorageConnection()
    console.log('Storage retest:', retestStorage)

    return {
      database: dbTest,
      storage: retestStorage,
      bucketCreation: createResult
    }
  }

  return {
    database: dbTest,
    storage: storageTest
  }
}
