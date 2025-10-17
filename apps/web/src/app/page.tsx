'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  HeartPulse,
  FileText,
  Activity,
  Upload,
  Brain,
  TrendingUp,
  Lock,
  Shield,
  CheckCircle,
  ArrowRight,
  Check,
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Redirect logged-in users to new Carbly dashboard
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen -mt-4 sm:-mt-6">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center space-y-6">
          <div className="flex justify-center mb-6">
            <Activity className="w-20 h-20 text-blue-600" />
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
            See How Food
            <br />
            Affects Your Blood Sugar
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Snap photos of your meals, track glucose, and discover personalized insights—all in under 3 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-10 py-5 rounded-xl font-semibold text-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
            >
              Start Free Trial
              <ArrowRight className="w-6 h-6" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-10 py-5 rounded-xl font-semibold text-xl hover:bg-gray-50 hover:border-blue-600 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photo-First Tracking */}
          <div className="bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-all space-y-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-3xl">
              📸
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Snap & Track
            </h3>
            <p className="text-base text-gray-600">
              Take a photo of your meal and get instant nutrition analysis. No typing, no guessing.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                AI food recognition
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                <span className="font-semibold">&lt;3 second</span> analysis
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Complete nutrition breakdown
              </li>
            </ul>
          </div>

          {/* Glucose Predictions */}
          <div className="bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-all space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl">
              📊
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Smart Predictions
            </h3>
            <p className="text-base text-gray-600">
              See how each meal will affect your blood sugar before you eat it.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Personalized glucose forecasts
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                CGM integration
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Apple Health sync
              </li>
            </ul>
          </div>

          {/* Pattern Insights */}
          <div className="bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-all space-y-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl">
              💡
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Actionable Insights
            </h3>
            <p className="text-base text-gray-600">
              Discover which foods work best for YOUR unique metabolism.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Daily pattern detection
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Best/worst food rankings
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Weekly progress reports
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-16 bg-gradient-to-br from-blue-50 to-white rounded-3xl">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16">
          3 Steps to Better Control
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Step 1 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg">
              1
            </div>
            <div className="flex justify-center text-5xl">
              📸
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              Snap Your Meal
            </h3>
            <p className="text-gray-600 text-lg">
              Point your camera at any meal and tap. That's it.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg">
              2
            </div>
            <div className="flex justify-center text-5xl">
              🤖
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Get Instant Analysis</h3>
            <p className="text-gray-600 text-lg">
              AI identifies ingredients and predicts glucose impact in seconds
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold shadow-lg">
              3
            </div>
            <div className="flex justify-center text-5xl">
              📈
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              Learn & Optimize
            </h3>
            <p className="text-gray-600 text-lg">
              Track patterns and discover what works for YOUR body
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Privacy */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gray-50 rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Private & Secure
                </h3>
                <p className="text-sm text-gray-600">
                  Your data stays yours, encrypted and secure
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Medical-Grade Privacy
                </h3>
                <p className="text-sm text-gray-600">
                  Built for sensitive health information
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  No Diagnosis
                </h3>
                <p className="text-sm text-gray-600">
                  Educational insights, not medical advice
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="max-w-6xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-gray-500 leading-relaxed">
          Carbly provides educational insights only and is not a substitute for professional medical advice,
          diagnosis, or treatment. Predictions are informational and should not be used for dosing, diagnosis,
          or triage decisions. Always consult your healthcare provider.
        </p>
      </section>
    </div>
  )
}
