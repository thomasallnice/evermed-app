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
  return (
    <div className="min-h-screen -mt-4 sm:-mt-6">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center space-y-6">
          <div className="flex justify-center mb-6">
            <HeartPulse className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Your Health, Organized
            <br />
            and Understood
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Upload medical documents, track meals, and get clear AI-powered
            insights—all in one private, personal health hub.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/vault"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all"
            >
              Upload Document
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medical Records Card */}
          <div className="bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              Understand Your Medical Documents
            </h3>
            <p className="text-base text-gray-600">
              Upload lab results, imaging reports, and medical records. Get
              clear AI explanations in plain language.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Secure document storage
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                AI-powered explanations
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Smart search and organization
              </li>
            </ul>
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors pt-2"
            >
              Go to Vault
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Metabolic Insights Card */}
          <div className="bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-all space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">
              Track Your Metabolic Health
            </h3>
            <p className="text-base text-gray-600">
              Snap photos of your meals, track glucose, and discover patterns in
              your metabolic health.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Food photo tracking
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Glucose monitoring
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                Personalized insights
              </li>
            </ul>
            <Link
              href="/metabolic/camera"
              className="inline-flex items-center gap-2 text-green-600 font-semibold hover:text-green-700 transition-colors pt-2"
            >
              Track a Meal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              1
            </div>
            <div className="flex justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Upload or Capture
            </h3>
            <p className="text-gray-600">
              Add medical documents or food photos with just a tap
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              2
            </div>
            <div className="flex justify-center">
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">AI Analysis</h3>
            <p className="text-gray-600">
              Our AI extracts and explains key information automatically
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              3
            </div>
            <div className="flex justify-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Actionable Insights
            </h3>
            <p className="text-gray-600">
              Understand your health and make informed decisions
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
        <p className="text-xs text-gray-500">
          EverMed provides educational health insights, not medical advice.
          Always consult healthcare professionals for medical decisions.
        </p>
      </section>
    </div>
  )
}
