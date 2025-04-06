import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 -mt-16">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Product Discovery Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-driven collaborative platform for discovering problems, 
          ideating solutions, and generating product requirements—all in one place.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Link 
            href="/sign-in"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition"
          >
            Get Started
          </Link>
          <Link 
            href="#features"
            className="inline-block bg-white hover:bg-gray-100 text-blue-600 border border-blue-600 px-6 py-3 rounded-md font-medium transition"
          >
            Learn More
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Problem Discovery Session</span>
            <span>Collaborative</span>
          </div>
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
            <p className="text-left text-gray-800 mb-2">
              <span className="font-semibold">Problem Statement:</span> Mobile checkout process has 38% abandonment rate
            </p>
            <div className="flex gap-2 text-sm">
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">High Impact</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">User Experience</span>
            </div>
          </div>
          <div className="border border-gray-200 rounded-md p-4 bg-blue-50">
            <p className="text-left text-gray-800 mb-2">
              <span className="font-semibold">AI Solution:</span> Single-page progressive checkout with smart defaults
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div className="bg-blue-600 h-2 rounded-full w-3/5"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Implementation Complexity: Medium</span>
              <span>Est. Impact: High</span>
            </div>
          </div>
        </div>
      </div>
      
      <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Collaborative Problem Discovery</h3>
          <p className="text-gray-600">
            Bring your team together to identify and prioritize problems with real-time AI assistance.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">AI-Powered Solutions</h3>
          <p className="text-gray-600">
            Generate innovative solution ideas leveraging cutting-edge AI technologies.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Automatic Documentation</h3>
          <p className="text-gray-600">
            Transform collaborative sessions into professional PRDs and specifications automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
