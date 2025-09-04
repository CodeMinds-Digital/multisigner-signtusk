import { getSupabaseClient } from './dynamic-supabase'

// Create a more robust proxy that handles all Supabase client operations
export const supabase = new Proxy({} as any, {
    get(_target, prop) {
        const client = getSupabaseClient()
        const value = client[prop as keyof typeof client]

        // If it's a function, bind it to the client to preserve context
        if (typeof value === 'function') {
            return value.bind(client)
        }

        // For properties, return the value directly
        return value
    },

    // Handle property setting (though Supabase client is mostly read-only)
    set(_target, prop, value) {
        const client = getSupabaseClient()
            ; (client as any)[prop] = value
        return true
    },

    // Handle property existence checks
    has(_target, prop) {
        const client = getSupabaseClient()
        return prop in client
    },

    // Handle property enumeration
    ownKeys(_target) {
        const client = getSupabaseClient()
        return Object.keys(client)
    },

    // Handle property descriptor requests
    getOwnPropertyDescriptor(_target, prop) {
        const client = getSupabaseClient()
        return Object.getOwnPropertyDescriptor(client, prop)
    }
})
