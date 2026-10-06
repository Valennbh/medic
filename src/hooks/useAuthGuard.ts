import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuthGuard(requiredRole?: 'doctor' | 'assistant') {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [role, setRole] = useState<'doctor' | 'assistant' | null>(null)

  useEffect(() => {
    let isMounted = true

    async function verifyAuth() {
      try {
        // Check Supabase session first
        const { data: { user }, error } = await supabase.auth.getUser()

        if (!isMounted) return

        if (!error && user) {
          const userRole = (user.user_metadata?.role as 'doctor' | 'assistant') || 'assistant'
          setRole(userRole)

          // Check if required role matches
          if (requiredRole && userRole !== requiredRole) {
            router.replace(userRole === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
            return
          }

          setIsReady(true)
          return
        }

        // If no Supabase user, check localStorage for demo session
        const demoSession = localStorage.getItem('medic_dental_demo_session') === 'true'
        const demoRole = localStorage.getItem('medic_dental_demo_role') as 'doctor' | 'assistant' | null

        if (!isMounted) return

        if (!demoSession || !demoRole) {
          // No session found - redirect to login immediately
          router.replace('/login')
          return
        }

        setRole(demoRole)

        // Check if required role matches
        if (requiredRole && demoRole !== requiredRole) {
          router.replace(demoRole === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
          return
        }

        setIsReady(true)
      } catch (err) {
        if (isMounted) {
          console.error('Auth verification error:', err)
          router.replace('/login')
        }
      }
    }

    verifyAuth()

    return () => {
      isMounted = false
    }
  }, [router, requiredRole])

  return { isReady, role }
}
