export default function LoadingAnimation() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Loading Dashboard...</h2>
        <p className="text-gray-500 mt-2">Please wait while we fetch your data</p>
      </div>
    </div>
  )
}
