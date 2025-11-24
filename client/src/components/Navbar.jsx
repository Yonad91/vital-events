import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between shadow">
      <div className="font-bold text-lg">DBVERS</div>
      <div className="space-x-4">
        <Link to="/dashboard" className="hover:underline">Dashboard</Link>
        <Link to="/events" className="hover:underline">Events</Link>
        <Link to="/certificates" className="hover:underline">Certificates</Link>
        <Link to="/reports" className="hover:underline">Reports</Link>
        <Link to="/users" className="hover:underline">Users</Link>
      </div>
    </nav>
  );
}
