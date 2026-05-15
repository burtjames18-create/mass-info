"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface UserRow {
  id: number;
  username: string;
  email: string;
  isAdmin: number;
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editing, setEditing] = useState<Record<number, Partial<UserRow & { password: string }>>>({});
  const [status, setStatus] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetch("/api/admin/users").then((r) => r.json()).then(setUsers);
    }
  }, [user]);

  const update = (id: number, field: string, value: string | boolean) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const save = async (id: number) => {
    const changes = editing[id];
    if (!changes || Object.keys(changes).length === 0) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    if (res.ok) {
      setStatus((p) => ({ ...p, [id]: "Saved" }));
      setEditing((p) => { const n = { ...p }; delete n[id]; return n; });
      fetch("/api/admin/users").then((r) => r.json()).then(setUsers);
    } else {
      setStatus((p) => ({ ...p, [id]: "Error" }));
    }
    setTimeout(() => setStatus((p) => { const n = { ...p }; delete n[id]; return n; }), 2000);
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setUsers((u) => u.filter((x) => x.id !== id));
  };

  if (loading || !user) return null;
  if (!user.isAdmin) return null;

  const inputCls = "bg-black border border-white/15 text-white text-xs px-2 py-1 focus:outline-none focus:border-white/40 w-full";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="text-xs tracking-[0.3em] uppercase text-white/30 mb-8 animate-fade-in-up">
        Admin — User Management
      </div>

      <div className="border border-white/10 animate-fade-in-up stagger-1">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8">
              {["ID", "Username", "Email", "Password", "Admin", "Joined", ""].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs tracking-[0.2em] uppercase text-white/25">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const ed = editing[u.id] ?? {};
              return (
                <tr key={u.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/2">
                  <td className="px-4 py-3 text-xs text-white/30">{u.id}</td>
                  <td className="px-4 py-3">
                    <input
                      className={inputCls}
                      defaultValue={u.username}
                      onChange={(e) => update(u.id, "username", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className={inputCls}
                      defaultValue={u.email}
                      onChange={(e) => update(u.id, "email", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="New password"
                      onChange={(e) => update(u.id, "password", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={ed.isAdmin !== undefined ? Boolean(ed.isAdmin) : Boolean(u.isAdmin)}
                      onChange={(e) => update(u.id, "isAdmin", e.target.checked)}
                      className="accent-white"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-white/25">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => save(u.id)}
                        className="text-xs tracking-widest uppercase border border-white/20 hover:border-white hover:bg-white hover:text-black px-3 py-1 transition-all"
                      >
                        {status[u.id] ?? "Save"}
                      </button>
                      {u.id !== user.userId && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-xs text-red-400/50 hover:text-red-400 transition-colors px-2 py-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
