export default function TestCSSPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          CSS Test Page
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-blue-600 mb-4">Primary Colors</h2>
            <div className="space-y-2">
              <div className="bg-blue-500 text-white p-3 rounded">Blue 500</div>
              <div className="bg-blue-600 text-white p-3 rounded">Blue 600</div>
              <div className="bg-blue-700 text-white p-3 rounded">Blue 700</div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-green-600 mb-4">Success Colors</h2>
            <div className="space-y-2">
              <div className="bg-green-500 text-white p-3 rounded">Green 500</div>
              <div className="bg-green-600 text-white p-3 rounded">Green 600</div>
              <div className="bg-green-700 text-white p-3 rounded">Green 700</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Error Colors</h2>
            <div className="space-y-2">
              <div className="bg-red-500 text-white p-3 rounded">Red 500</div>
              <div className="bg-red-600 text-white p-3 rounded">Red 600</div>
              <div className="bg-red-700 text-white p-3 rounded">Red 700</div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Button Styles</h2>
          <div className="flex flex-wrap gap-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
              Primary Button
            </button>
            <button className="bg-gray-100 text-gray-900 px-4 py-2 rounded hover:bg-gray-200 transition-colors">
              Secondary Button
            </button>
            <button className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors">
              Outline Button
            </button>
            <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
              Danger Button
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Form Elements</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Input
              </label>
              <input
                type="text"
                placeholder="Enter some text..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Dropdown
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            If you can see styled elements above, Tailwind CSS is working correctly! 🎉
          </p>
        </div>
      </div>
    </div>
  )
}
