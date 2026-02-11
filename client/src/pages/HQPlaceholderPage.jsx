export default function HQPlaceholderPage({ title }) {
  return (
    <div className="p-6">
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-600 mt-2">העמוד הזה יפותח בשלב הבא.</p>
      </div>
    </div>
  );
}
