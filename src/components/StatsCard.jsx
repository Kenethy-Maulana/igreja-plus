function StatsCard({ title, value }) {

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">

      <h2 className="text-gray-500">
        {title}
      </h2>

      <h1 className="text-4xl font-bold text-purple-700 mt-2">
        {value}
      </h1>

    </div>
  )
}

export default StatsCard