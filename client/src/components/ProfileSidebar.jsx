import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";

const ProfileSidebar = ({ user, setUser, className = "", onNavigateToMyRecords, onNavigateToRequestCertificate, onNavigateToMyCertificates, onAdminNavigate }) => {
    // Redirect to login if user is null
    useEffect(() => {
        if (!user) {
            window.location.href = "/login";
        }
    }, [user]);
    const [collapsed, setCollapsed] = useState(false);
    const [profilePic, setProfilePic] = useState(user?.profile?.profilePic || "");
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notLoading, setNotLoading] = useState(false);
    const fileInputRef = useRef();

    const fetchNotifications = React.useCallback(async () => {
        setNotLoading(true);
        try {
            const res = await apiFetch('/users/notifications', { token: user.token });
            setNotifications(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setNotLoading(false);
        }
    }, [user?.token]);

    useEffect(() => {
        setProfilePic(user?.profile?.profilePic || "");
        // fetch notifications when sidebar mounts or user changes
        if (user?.token) {
            fetchNotifications();
        }
    }, [user, fetchNotifications]);

    // SSE: open EventSource to receive real-time notifications
    useEffect(() => {
        if (!user?.token) return;
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/notifications/stream?token=${encodeURIComponent(user.token)}`;
        const es = new EventSource(url);
        es.onmessage = (ev) => {
            try {
                const payload = JSON.parse(ev.data);
                setNotifications((prev) => [payload, ...prev]);
            } catch (e) {
                console.error('Invalid SSE payload', e);
            }
        };
        es.onerror = (err) => {
            // try reconnect handled by browser; log silently
            console.error('SSE error', err);
        };
        return () => {
            try { es.close(); } catch (closeErr) { console.error('Error closing SSE', closeErr); }
        };
    }, [user?.token]);

    

    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("profilePic", file);
            const res = await apiFetch("/users/me/profile", {
                method: "PUT",
                token: user.token,
                body: formData,
                isForm: true,
            });
            const newPic = res.user?.profile?.profilePic || "";
            setProfilePic(newPic);
            setUser({
                ...user,
                profile: {
                    ...user.profile,
                    profilePic: newPic
                }
            });
            setPreview(null);
        } catch (e) {
            alert("Failed to upload profile picture");
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside
            className={`flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 shadow-xl border-r transition-all duration-300 ${collapsed ? 'w-16' : 'w-80'} ${className}`}
            style={{paddingLeft: 0, marginLeft: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0}}
        >
        <div className="w-full flex justify-end items-start">
            <button
                className="mt-2 mr-2 bg-gray-200 rounded-full p-2 shadow hover:bg-gray-300 z-10 flex items-center justify-center"
                style={{width: 36, height: 36}}
                onClick={() => setCollapsed(c => !c)}
                title={collapsed ? 'Maximize sidebar' : 'Minimize sidebar'}
            >
                <span style={{display: 'block'}}>
                  <span style={{display: 'block', width: 18, height: 3, background: '#333', borderRadius: 2, marginBottom: 4}}></span>
                  <span style={{display: 'block', width: 18, height: 3, background: '#333', borderRadius: 2, marginBottom: 4}}></span>
                  <span style={{display: 'block', width: 18, height: 3, background: '#333', borderRadius: 2}}></span>
                </span>
            </button>
        </div>
        <div className={collapsed ? 'hidden' : ''}>
            <div className="flex flex-col items-center mb-8">
                <div className="relative w-28 h-28 mb-3">
                    <img
                        src={preview || profilePic || "/vite.svg"}
                        alt="Profile"
                        className="w-28 h-28 rounded-full object-cover border-4 border-blue-100 shadow-md"
                    />
                    <button
                        className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2 text-xs shadow hover:bg-blue-700 transition"
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        title="Change profile picture"
                    >
                        <span role="img" aria-label="camera" style={{ fontSize: 16 }}>📷</span>
                    </button>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleProfilePicChange}
                        disabled={loading}
                    />
                </div>
                <div className="mt-2 text-xl font-bold text-gray-800">
                    <span>{user.name}</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">Role: <span className="font-medium text-gray-700">{user.role}</span></div>
                {user.email && <div className="mt-1 text-xs text-gray-400">{user.email}</div>}
                {user.profile?.organization && <div className="mt-1 text-xs text-gray-400">{user.profile.organization}</div>}
                <div className="mt-4 w-full">
                    <button className="w-full border text-indigo-700 bg-white py-2 rounded flex items-center justify-between px-3 hover:bg-indigo-50 transition" onClick={() => { setShowNotifications(s => !s); if (!showNotifications) fetchNotifications(); }}>
                        <span>Notifications</span>
                        <span className="text-sm bg-indigo-600 text-white px-2 py-0.5 rounded">{notifications.filter(n => !n.read).length}</span>
                    </button>
                    {showNotifications && (
                        <div className="mt-2 max-h-56 overflow-auto bg-white border rounded p-2">
                            {notLoading ? <div className="text-sm text-gray-500">Loading...</div> : (
                                notifications.length === 0 ? <div className="text-sm text-gray-500">No notifications</div> : (
                                    notifications.map(n => (
                                        <div key={n._id} className={`p-2 border-b ${n.read ? 'opacity-60' : ''}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="text-sm text-gray-600 font-normal">{n.message}</div>
                                                <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                                            </div>
                                            {!n.read && <div className="mt-1"><button className="text-xs text-indigo-600" onClick={async () => { await apiFetch(`/users/notifications/${n._id}/read`, { method: 'PATCH', token: user.token }); fetchNotifications(); }}>Mark read</button></div>}
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
			{/* Manager-specific menu */}
			{user?.role === 'manager' && (
				<div className="px-4 mb-6">
					<div className="text-sm font-semibold mb-2 text-gray-700">Manager Menu</div>
					<div className="flex flex-col gap-2">
						{/* Events dropdown */}
						<div className="bg-white border rounded">
							<button
								className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
								onClick={(e) => {
									const menu = e.currentTarget.nextSibling;
									const willOpen = menu.style.display !== 'block';
									menu.style.display = willOpen ? 'block' : 'none';
									try {
										if (willOpen) {
											window.location.hash = '#events';
										} else {
											// Clear selection and close view
											if (window.location.hash.startsWith('#events')) {
												window.location.hash = '';
											}
										}
									} catch {}
								}}
							>
								<span>Events</span>
								<span>▾</span>
							</button>
							<div className="hidden flex-col" style={{ display: 'none' }}>
								<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#events/pending'; }}>Pending Events</button>
								<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#events/rejected'; }}>Rejected Events</button>
								<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#events/approved'; }}>Approved Events</button>
							</div>
						</div>

						<button
							className="w-full bg-white text-left px-3 py-2 rounded border hover:bg-gray-50"
							onClick={() => { window.location.hash = '#certificates'; }}
						>
							Certificate Management
						</button>
						<button
							className="w-full bg-white text-left px-3 py-2 rounded border hover:bg-gray-50"
							onClick={() => { window.location.hash = '#agents'; }}
						>
							Agents Management
						</button>
						<button
							className="w-full bg-white text-left px-3 py-2 rounded border hover:bg-gray-50"
							onClick={() => { window.location.hash = '#reports'; }}
						>
							Reports
						</button>
					</div>
				</div>
			)}
			{/* Register New Event for registrar, hospital, mosque, church */}
			{(user?.role === 'registrar' || user?.role === 'hospital' || user?.role === 'mosque' || user?.role === 'church') && (
				<div className="px-4 mb-6">
					<div className="text-sm font-semibold mb-2 text-gray-700">Register New Event</div>
					<div className="bg-white border rounded">
						<button
							className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
							onClick={(e) => {
								const menu = e.currentTarget.nextSibling;
								const willOpen = menu.style.display !== 'block';
								menu.style.display = willOpen ? 'block' : 'none';
							}}
						>
							<span>Select Event Type</span>
							<span>▾</span>
						</button>
						<div className="hidden flex-col" style={{ display: 'none' }}>
							{user?.role === 'registrar' && (
								<>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/birth'; }}>
										👶 Birth Registration
									</button>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/marriage'; }}>
										💒 Marriage Registration
									</button>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/death'; }}>
										⚰️ Death Registration
									</button>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/divorce'; }}>
										📄 Divorce Registration
									</button>
								</>
							)}
							{user?.role === 'hospital' && (
								<>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/birth'; }}>
										👶 Birth Registration
									</button>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/death'; }}>
										⚰️ Death Registration
									</button>
								</>
							)}
							{(user?.role === 'mosque' || user?.role === 'church') && (
								<>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/marriage'; }}>
										💒 Marriage Registration
									</button>
									<button className="text-left px-5 py-2 hover:bg-gray-50" onClick={() => { window.location.hash = '#register/death'; }}>
										⚰️ Death Registration
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}
			{/* My Events and Reports for registrar, hospital, mosque, church */}
			{(user?.role === 'registrar' || user?.role === 'hospital' || user?.role === 'mosque' || user?.role === 'church') && (
				<div className="px-4 mb-6">
					<div className="flex flex-col gap-2">
						<button
							className="w-full bg-white text-left px-3 py-2 rounded border hover:bg-gray-50 flex items-center"
							onClick={() => { window.location.hash = '#my-events'; }}
						>
							<span className="mr-2">📋</span>
							My Events
						</button>
						<button
							className="w-full bg-white text-left px-3 py-2 rounded border hover:bg-gray-50 flex items-center"
							onClick={() => { window.location.hash = '#reports'; }}
						>
							<span className="mr-2">📊</span>
							Reports
						</button>
					</div>
				</div>
			)}
			{/* Quick actions for registrant */}
			{user?.role === 'registrant' && (
				<div className="px-4 mb-6">
					<div className="text-sm font-semibold mb-2 text-gray-700">Quick Actions</div>
					<div className="flex flex-col gap-2">
						<button
							className="w-full text-blue-700 py-2 rounded shadow transition"
							onClick={() => {
								if (typeof onNavigateToMyRecords === 'function') {
									onNavigateToMyRecords();
								} else {
									// fallback navigate then attempt scroll
									window.location.href = '/registrant#my-records';
								}
							}}
						>
							View my records
						</button>
						<button
							className="w-full text-purple-700 py-2 rounded shadow transition"
							onClick={() => {
								if (typeof onNavigateToMyCertificates === 'function') {
									onNavigateToMyCertificates();
								} else {
									window.location.href = '/registrant#my-certificates';
								}
							}}
						>
							My Certificates
						</button>
						<button
							className="w-full text-green-700 py-2 rounded shadow transition"
							onClick={() => {
								if (typeof onNavigateToRequestCertificate === 'function') {
									onNavigateToRequestCertificate();
								} else {
									window.location.href = '/registrant#request-certificate';
								}
							}}
						>
							Request Certificate
						</button>
					</div>
				</div>
			)}
      {/* Admin quick actions */}
      {user?.role === 'admin' && (
        <div className="px-4 mb-6">
          <div className="text-sm font-semibold mb-2 text-gray-700">Admin Actions</div>
          <div className="flex flex-col gap-2">
            <button
              className="w-full bg-white text-left px-3 py-2 rounded border hover:bg-gray-50 flex items-center"
              onClick={() => {
                if (typeof onAdminNavigate === "function") {
                  onAdminNavigate("create");
                  return;
                }
                try {
                  const el = document.querySelector("#admin-create-user");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                } catch {
                  window.location.hash = "#create-user";
                }
              }}
            >
              <span className="mr-2">➕</span>
              Register New User
            </button>
            <button
              className="w-full bg-white text-left px-3 py-2 rounded border hover:bg-gray-50 flex items-center"
              onClick={() => {
                if (typeof onAdminNavigate === "function") {
                  onAdminNavigate("users");
                  return;
                }
                try {
                  const el = document.querySelector("#admin-users-list");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                } catch {
                  window.location.hash = "#users";
                }
              }}
            >
              <span className="mr-2">👥</span>
              Registered Users
            </button>
          </div>
        </div>
      )}
            <div className="flex-grow" />
        </div>
        </aside>
    );
};

export default ProfileSidebar;
