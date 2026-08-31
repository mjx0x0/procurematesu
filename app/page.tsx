import Link from "next/link";
import { 
  FileText, 
  Search, 
  Bot, 
  Shield, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  Users,
  Award,
  Zap,
  GraduationCap,
  Building2
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* ===== NAVIGATION ===== */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">ProcuremateSU</span>
              <span className="hidden sm:inline text-sm text-gray-500 font-medium">| MSU-GenSan</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl -z-10 animate-float" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl -z-10 animate-float" style={{ animationDelay: '2s' }} />
        
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6 animate-slide-up">
            <Sparkles className="h-4 w-4" />
            Now Available for MSU-GenSan
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-slide-up delay-100">
            Digital Procurement
            <br />
            <span className="gradient-text">
              Logbook & AI Assistant
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up delay-200">
            Streamline your procurement process with AI-powered assistance.
            Track purchase requests, get guidance, and ensure compliance with RA 12009.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-300">
            <Link
              href="/auth/login"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:shadow-2xl hover:shadow-blue-600/30 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Sign In
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto animate-slide-up delay-400">
            <div className="glass-effect rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-bold gradient-text">100%</div>
              <div className="text-sm text-gray-600">RA 12009 Compliant</div>
            </div>
            <div className="glass-effect rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-bold gradient-text">24/7</div>
              <div className="text-sm text-gray-600">AI Support Available</div>
            </div>
            <div className="glass-effect rounded-2xl p-6 shadow-sm">
              <div className="text-3xl font-bold gradient-text">Real-Time</div>
              <div className="text-sm text-gray-600">Tracking & Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for
              <span className="gradient-text"> Efficient Procurement</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Powered by AI and designed for compliance with the New Government Procurement Act (RA 12009)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "Digital Logbook",
                description: "Centralized recording and tracking of all Purchase Requests with complete audit trails.",
              },
              {
                icon: Bot,
                title: "AI Inquiry Support",
                description: "Get instant answers to procurement questions. Draft PRs with AI-assisted slot-filling.",
              },
              {
                icon: Search,
                title: "Real-Time Tracking",
                description: "Monitor your Purchase Request status from submission to completion, with live updates.",
              },
              {
                icon: Shield,
                title: "RA 12009 Compliant",
                description: "Built to align with the New Government Procurement Act and university procurement policies.",
              },
              {
                icon: Clock,
                title: "Faster Processing",
                description: "Reduce processing delays with automated workflows and streamlined communication.",
              },
              {
                icon: CheckCircle,
                title: "Transparency & Accountability",
                description: "Complete visibility into procurement decisions with auditable logs and documentation.",
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100"
              >
                <div className="w-14 h-14 gradient-bg rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get Started in
              <span className="gradient-text"> 4 Simple Steps</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From request to approval - streamlined for your convenience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Log in", desc: "Create your account using your MSU-GenSan email" },
              { step: "2", title: "Draft Request", desc: "Fill out the Purchase Request form with AI assistance" },
              { step: "3", title: "Track Progress", desc: "Monitor your request status in real-time" },
              { step: "4", title: "Get Approved", desc: "Receive notifications when your request is processed" }
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                {index < 3 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-indigo-200 -z-10" />
                )}
                <div className="w-16 h-16 gradient-bg text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-blue-600/30">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative gradient-bg rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Procurement?
              </h2>
              <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                Join MSU-GenSan's digital transformation journey today.
              </p>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all hover:scale-105"
              >
                Get Started Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-semibold">ProcuremateSU</span>
              <span className="text-sm">| MSU-GenSan</span>
            </div>
            <div className="text-sm text-center md:text-right">
              <p>Mindanao State University - General Santos</p>
              <p className="text-gray-500">Digital Procurement Logbook with AI Inquiry Support</p>
              <p className="text-gray-600 text-xs mt-2">© 2026 ProcuremateSU. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}