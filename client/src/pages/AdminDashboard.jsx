"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import ProfileSidebar from "../components/ProfileSidebar";


const AdminDashboard = ({ user, setUser }) => {
  // Redirect to login if user is null
  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);
  const [stats, setStats] = useState({
    users: { total: 0 },
    events: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      draft: 0
    }
  });
  const [users, setUsers] = useState([]);
  const [actionUser, setActionUser] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "registrant" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "" });
  const confirmRef = useRef();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [lang, setLang] = useState("en");
  const [adminView, setAdminView] = useState("overview"); // overview | create | users

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch users and stats in parallel
        const [userList, statsData] = await Promise.all([
          apiFetch("/users/admin/users", { token: user.token }),
          apiFetch("/users/admin/stats", { token: user.token })
        ]);
        
        const arr = Array.isArray(userList) ? userList : [];
        setUsers(arr);
        setStats(statsData || { users: { total: arr.length }, events: { total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 } });
      } catch (e) {
        console.error("Admin fetch error:", e.message);
        setUsers([]);
        setStats({ users: { total: 0 }, events: { total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 } });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, user?.token]);

  const changeRole = async (id, role) => {
    try {
      const res = await apiFetch(`/users/admin/users/${id}/role`, {
        method: "PATCH",
        token: user.token,
        body: { role },
      });
      const updated = res.user ?? res;
      setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)));
      setToast({ message: "Role updated successfully.", type: "success" });
    } catch (e) {
      setToast({ message: "Failed to update role.", type: "error" });
      console.error("Change role error:", e.message);
    }
    setTimeout(() => setToast({ message: "", type: "" }), 2000);
  };

  const deleteUser = (id) => {
    setPendingDelete(id);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await apiFetch(`/users/admin/users/${pendingDelete}`, { method: "DELETE", token: user.token });
      setUsers((prev) => prev.filter((u) => u._id !== pendingDelete));
      // Refresh stats after user deletion
      const statsData = await apiFetch("/users/admin/stats", { token: user.token });
      setStats(statsData || stats);
      setToast({ message: "User deleted successfully.", type: "success" });
    } catch (e) {
      setToast({ message: "Failed to delete user.", type: "error" });
      console.error("Delete user error:", e.message);
    }
    setTimeout(() => setToast({ message: "", type: "" }), 2000);
    setPendingDelete(null);
    setShowConfirmDelete(false);
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      // Create base user (defaults to registrant on server)
      const created = await apiFetch(`/users/register`, {
        method: "POST",
        body: { name: newUser.name, email: newUser.email, password: newUser.password },
        token: user.token,
      });
      let createdUser = created?.user || null;
      if (!createdUser?.id && !createdUser?._id) return;
      // Normalize _id for consistency
      if (createdUser?.id && !createdUser?._id) createdUser._id = createdUser.id;
      // If desired role differs, update
      if (newUser.role && newUser.role !== "registrant") {
        await changeRole(createdUser._id, newUser.role);
      }
      // Always reload user list after creation
      const list = await apiFetch("/users/admin/users", { token: user.token });
      // Normalize all users in the list
      setUsers(Array.isArray(list) ? list.map(u => ({ ...u, _id: u._id || u.id })) : []);
  setNewUser({ name: "", email: "", password: "", role: "registrant" });
  setShowActionMenu(false);
  setShowRoleSelector(false);
  setActionUser(null);
  // Refresh stats after user creation
  const statsData = await apiFetch("/users/admin/stats", { token: user.token });
  setStats(statsData || stats);
    } catch (e) {
      console.error("Create user error:", e.message);
    }
  };

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {lang === "en" ? "Total Users" : "ጠቅላላ ተጠቃሚዎች"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.users.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {lang === "en" ? "Total Events" : "ጠቅላላ ክስተቶች"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.events.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {lang === "en" ? "Pending Events" : "በጥበቃ ላይ ያሉ ክስተቶች"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.events.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {lang === "en" ? "Approved Events" : "የተጸድቁ ክስተቶች"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.events.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              {lang === "en" ? "Rejected Events" : "የተቀበሩ ክስተቶች"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.events.rejected}</div>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-white/80 border border-gray-100 shadow">
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === "en" ? "Overview" : "እይታ"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-gray-600 space-y-4">
          <p>
            {lang === "en"
              ? "Welcome to the admin control center. From here you can track platform activity, manage registered users, and review event submissions across all roles."
              : "ወደ አስተዳደር መቆጣጠሪያ ማዕከል እንኳን ደህና መጡ። ከዚህ ቦታ የመድረክ እንቅስቃሴዎችን ማስተካከል፣ የተመዘገቡን ተጠቃሚዎች ማስተዳደር እና የተለያዩ ሚናዎች ያቀረቡትን ዝርዝሮች ማጣራት ትችላላችሁ።"}
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              {lang === "en"
                ? "Use the sidebar actions to register new users or open the full user directory."
                : "አዲስ ተጠቃሚዎችን ለመመዝገብ ወይም የተመዘገቡን ሰዎች እስከ መጨረሻ ለማየት የጎን ምናሌውን ይጠቀሙ።"}
            </li>
            <li>
              {lang === "en"
                ? "Keep an eye on the metrics above to monitor pending, approved, and rejected events."
                : "በላይ ያሉትን መጠንቀቅ መለኪያዎች በመተከል በማስተካከል ላይ፣ የተጸዱ እና የተቀበሩ ክስተቶችን ያስተዳድሩ።"}
            </li>
            <li>
              {lang === "en"
                ? "Audit trails and role management tools are available inside the Registered Users view."
                : "የታሪክ ሪፖርቶች እና የሚና አስተዳደር መሣሪያዎችን በየተመዘገቡ ተጠቃሚዎች እይታ ውስጥ ማግኘት ይችላሉ።"}
            </li>
          </ul>
          <p className="text-gray-500 text-xs">
            {lang === "en"
              ? "Tip: click “Register New User” in the sidebar to open the dedicated creation form."
              : "ምክር፡- የተመዘገቡን ተጠቃሚዎች ለመመዝገብ በጎን ምናሌው ያለውን “አዲስ ተጠቃሚ ይመዝግቡ” ቁልፍ ይጫኑ።"}
          </p>
        </CardContent>
      </Card>
    </>
  );

  const renderCreateCard = () => (
    <>
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setAdminView("overview")}>
          {lang === "en" ? "Back to Dashboard" : "ወደ ዳሽቦርድ ተመለስ"}
        </Button>
      </div>
      <Card id="admin-create-user">
        <CardHeader>
          <CardTitle>
            {lang === "en" ? "Create New User" : "አዲስ ተጠቃሚ ይፍጠሩ"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder={lang === "en" ? "Name" : "ስም"}
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="px-3 py-2 border rounded-md"
                required
              />
              <input
                type="email"
                placeholder={lang === "en" ? "Email" : "ኢሜይል"}
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="px-3 py-2 border rounded-md"
                required
              />
              <input
                type="password"
                placeholder={lang === "en" ? "Password" : "የሚስጥር ቃል"}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="px-3 py-2 border rounded-md"
                required
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="px-3 py-2 border rounded-md"
              >
                <option value="registrant">{lang === "en" ? "Registrant" : "ተመዝጋቢ"}</option>
                <option value="registrar">{lang === "en" ? "Registrar" : "መዝገበ ካሳ"}</option>
                <option value="hospital">{lang === "en" ? "Hospital" : "ሆስፒታል"}</option>
                <option value="church">{lang === "en" ? "Church" : "ቤተ ክርስቲያን"}</option>
                <option value="mosque">{lang === "en" ? "Mosque" : "መስጊድ"}</option>
                <option value="manager">{lang === "en" ? "Manager" : "ማነጂ"}</option>
                <option value="admin">{lang === "en" ? "Admin" : "አስተዳደር"}</option>
              </select>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              {lang === "en" ? "Create User" : "ተጠቃሚ ይፍጠሩ"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );

  const renderUsersCard = () => (
    <>
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setAdminView("overview")}>
          {lang === "en" ? "Back to Dashboard" : "ወደ ዳሽቦርድ ተመለስ"}
        </Button>
      </div>
      <Card id="admin-users-list">
        <CardHeader>
          <CardTitle>
            {lang === "en" ? "Registered Users" : "የተመዘገቡ ተጠቃሚዎች"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              {lang === "en" ? "Loading..." : "በመጫን ላይ..."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === "en" ? "Name" : "ስም"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === "en" ? "Email" : "ኢሜይል"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === "en" ? "Role" : "ሚና"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === "en" ? "Status" : "ሁኔታ"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === "en" ? "Actions" : "ድርጊቶች"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u._id || u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.active 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {u.active 
                            ? (lang === "en" ? "Active" : "ንቁ") 
                            : (lang === "en" ? "Inactive" : "ንቁ አይደለም")
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                        <Button
                          onClick={() => {
                            setActionUser(u);
                            setShowActionMenu(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          {lang === "en" ? "Action" : "ድርጊት"}
                        </Button>
                        {showActionMenu && actionUser && actionUser._id === u._id && (
                          <div className="absolute z-10 right-0 mt-2 w-40 bg-white border rounded shadow-lg">
                            <button
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setShowRoleSelector(true);
                                setShowActionMenu(false);
                              }}
                            >{lang === "en" ? "Change Role" : "ሚና ይቀይሩ"}</button>
                            <button
                              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                              onClick={() => {
                                deleteUser(u._id || u.id);
                                setShowActionMenu(false);
                              }}
                            >{lang === "en" ? "Delete User" : "ተጠቃሚ ያስወግዱ"}</button>
                          </div>
                        )}
                        {showRoleSelector && actionUser && actionUser._id === u._id && (
                          <div className="absolute z-20 right-0 mt-2 w-48 bg-white border rounded shadow-lg p-4">
                            <div className="mb-2 font-semibold">{lang === "en" ? "Select Role" : "ሚና ይምረጡ"}</div>
                            <select
                              value={actionUser.role}
                              onChange={e => {
                                changeRole(actionUser._id || actionUser.id, e.target.value);
                                setShowRoleSelector(false);
                              }}
                              className="w-full px-2 py-1 border rounded"
                            >
                              <option value="registrant">{lang === "en" ? "Registrant" : "ተመዝጋቢ"}</option>
                              <option value="registrar">{lang === "en" ? "Registrar" : "መዝገበ ካሳ"}</option>
                              <option value="hospital">{lang === "en" ? "Hospital" : "ሆስፒታል"}</option>
                              <option value="church">{lang === "en" ? "Church" : "ቤተ ክርስቲያን"}</option>
                              <option value="mosque">{lang === "en" ? "Mosque" : "መስጊድ"}</option>
                              <option value="manager">{lang === "en" ? "Manager" : "ማነጂ"}</option>
                              <option value="admin">{lang === "en" ? "Admin" : "አስተዳደር"}</option>
                            </select>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={() => setShowRoleSelector(false)}>{lang === "en" ? "Close" : "ዝጋ"}</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <div className="h-screen sticky top-0" style={{width: '20rem', margin: 0, padding: 0, left: 0}}>
        <ProfileSidebar user={user} setUser={setUser} onAdminNavigate={setAdminView} />
      </div>
      <div className="flex-1 p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {adminView === "create"
            ? (lang === "en" ? "Register New User" : "አዲስ ተጠቃሚ ይመዝግቡ")
            : adminView === "users"
              ? (lang === "en" ? "Registered Users" : "የተመዘገቡ ተጠቃሚዎች")
              : (lang === "en" ? "Admin Dashboard" : "የአስተዳደር ዳሽቦርድ")}
        </h1>
        <Button onClick={() => setLang(lang === "en" ? "am" : "en")}>
          {lang === "en" ? "አማርኛ" : "English"}
        </Button>
      </div>

      {adminView === "overview" && renderOverview()}
      {adminView === "create" && renderCreateCard()}
      {adminView === "users" && renderUsersCard()}
      </div>
      {/* Toast Notification */}
      {toast.message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="rounded-lg p-6 shadow-xl border bg-white min-w-[320px]">
            <div className="mb-4 text-lg font-semibold">Are you sure you want to delete this user?</div>
            <div className="flex flex-row gap-4 justify-end w-full">
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
              <Button variant="outline" onClick={() => setShowConfirmDelete(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
