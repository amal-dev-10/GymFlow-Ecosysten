"use client";

import { deviceApi } from "@/lib/deviceApi";
import { useState } from "react";
import { Users, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { useMembersStore } from "@/store/useMembersStore";

export default function MemberSyncPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { members, setMembers, clearMembers: clearStore } = useMembersStore();
  
  const triggerSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await deviceApi.syncMembers({});
      if (result.success && result.data) {
        setMembers(result.data);
      }
      alert(`Member sync triggered! Synced ${result.data?.length || 0} members.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearMembers = () => {
    if (confirm("Clear local mock members?")) {
      clearStore();
      setCurrentPage(1);
      alert("Local members cleared.");
    }
  };

  const totalPages = Math.ceil(members.length / itemsPerPage);
  const currentMembers = members.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Member Synchronization</h1>
        <p className="text-sm text-neutral-400">Emulate pushing or pulling biometrics and access rules.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-300">Sync Now</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Request an immediate sync of all members from the GymFlow backend.
          </p>
          <button
            onClick={triggerSync}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Syncing..." : "Sync Members"}
          </button>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-300">Clear Local State</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Wipe all synchronized members from the device simulator's mock memory.
          </p>
          <button
            onClick={clearMembers}
            className="flex items-center gap-2 rounded-md border border-red-500/50 text-red-400 px-4 py-2 text-sm font-medium hover:bg-red-500/10"
          >
            <Trash2 size={16} />
            Clear Members
          </button>
        </div>
      </div>
      
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
         <h2 className="mb-4 text-sm font-medium text-neutral-300">Local Memory Snapshot</h2>
         {members.length === 0 ? (
           <div className="flex h-32 items-center justify-center rounded border border-dashed border-neutral-700">
              <div className="text-center">
                <Users size={32} className="mx-auto mb-2 text-neutral-600" />
                <p className="text-sm text-neutral-500">0 Members Synced</p>
              </div>
           </div>
         ) : (
           <div className="space-y-2">
             <div className="flex items-center gap-2 mb-4">
               <CheckCircle2 size={16} className="text-emerald-500" />
               <span className="text-sm text-emerald-400 font-medium">{members.length} Members Synced</span>
             </div>
             <div className="rounded-md border border-neutral-800 bg-neutral-950">
               {currentMembers.map((m, i) => (
                 <div key={i} className="flex justify-between items-center p-3 border-b border-neutral-800/60 last:border-0">
                   <span className="text-sm font-medium text-neutral-200">{m.name}</span>
                   <span className="text-xs font-mono text-neutral-500">ID: {m.externalUserId}</span>
                 </div>
               ))}
             </div>
             
             {totalPages > 1 && (
               <div className="flex items-center justify-between pt-4">
                 <button
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
                   className="text-xs font-medium text-neutral-400 hover:text-white disabled:opacity-50 px-3 py-1.5 rounded bg-neutral-800"
                 >
                   Previous
                 </button>
                 <span className="text-xs text-neutral-500">
                   Page {currentPage} of {totalPages}
                 </span>
                 <button
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   disabled={currentPage === totalPages}
                   className="text-xs font-medium text-neutral-400 hover:text-white disabled:opacity-50 px-3 py-1.5 rounded bg-neutral-800"
                 >
                   Next
                 </button>
               </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
}
