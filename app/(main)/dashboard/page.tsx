"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const statCardConfig = [
  { 
    key: "requests", label: "Total Requests",
    color: "from-blue-500 to-cyan-500", bgLight: "bg-blue-50", textColor: "text-blue-600",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  },
  { 
    key: "partners", label: "Total Partners", 
    color: "from-orange-500 to-amber-500", bgLight: "bg-orange-50", textColor: "text-orange-600",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  { 
    key: "teams", label: "Allocated Teams",
    color: "from-violet-500 to-purple-500", bgLight: "bg-violet-50", textColor: "text-violet-600",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  },
  { 
    key: "members", label: "Field Members",
    color: "from-emerald-500 to-green-500", bgLight: "bg-emerald-50", textColor: "text-emerald-600",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
];

const COLORS = ['#ff7a00', '#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e'];

export default function DashboardHome() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Record<string, string>>({});
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [provinceData, setProvinceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isPartner = (session?.user as any)?.role === 'PARTNER';

  // Dynamic config based on role
  let dynamicCards = [...statCardConfig];
  
  if (isPartner) {
    // 1. Find the partners card index
    const partnerCardIdx = dynamicCards.findIndex(c => c.key === 'partners');
    
    if (partnerCardIdx !== -1) {
      // 2. Transform it to Certified Members card
      const certifiedCard = { 
        ...dynamicCards[partnerCardIdx], 
        key: 'certifiedMembers', 
        label: "Total Certified Members",
        icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      };
      
      // 3. Remove from current position and push to the end (rightmost)
      dynamicCards.splice(partnerCardIdx, 1);
      dynamicCards.push(certifiedCard);
    }
  }

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(res => res.json())
      .then(data => {
        setStats({
          partners: data.partners?.toString() || "0",
          certifiedMembers: data.certifiedMembers?.toString() || "0",
          requests: data.requests?.toString() || "0",
          teams: data.teams?.toString() || "0",
          members: data.members?.toString() || "0",
          pendingCerts: data.pendingCerts?.toString() || "0",
          sourcingCount: data.pipelineData?.find((d: any) => d.name === "Sourcing/Assigned")?.value?.toString() || "0",
          scheduledCount: data.pipelineData?.find((d: any) => d.name === "Training Scheduled")?.value?.toString() || "0",
        });
        setPipelineData(data.pipelineData || []);
        setProvinceData(data.provinceData || []);
      })
      .catch(err => console.error("Fetch stats error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in duration-500 pb-2">
      <div className="mb-4">
        <h1 className="text-xl font-black text-alita-black tracking-tight leading-none mb-1">
          Selamat datang, {session?.user?.name || "User"} 👋
        </h1>
        <p className="text-alita-gray-500 text-sm font-medium">
          {isPartner 
            ? "Berikut adalah ringkasan operasional tim Anda."
            : "Berikut adalah ringkasan operasional Onboarding Partner."
          }
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {dynamicCards.map((card, index) => (
          <div 
            key={card.key} 
            className="bg-alita-white p-4 rounded-2xl shadow-card border border-alita-gray-100/80 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.color} opacity-80`} />
            
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-alita-gray-400 leading-none">
                {card.label}
              </div>
              <div className={`w-9 h-9 ${card.bgLight} rounded-xl flex items-center justify-center ${card.textColor} group-hover:scale-110 transition-transform duration-300 shadow-sm opacity-80`}>
                {card.icon}
              </div>
            </div>

            {loading ? (
              <div className="skeleton h-8 w-20 rounded-lg mt-2" />
            ) : (
              <div className="text-3xl font-black text-alita-black tracking-tighter leading-none mt-1">
                {stats[card.key] || "0"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Pipeline Chart */}
        <div className="bg-alita-white rounded-2xl shadow-card border border-alita-gray-100/80 p-5 flex flex-col h-[280px]">
          <div className="mb-3">
            <h2 className="text-lg font-black text-alita-black tracking-tight leading-none mb-1">Onboarding Pipeline</h2>
            <p className="text-[11px] text-alita-gray-400 font-medium tracking-wide">Melacak jumlah tim/personel di setiap fase</p>
          </div>
          
          <div className="relative flex-1 w-full min-h-0">
            {loading ? (
              <div className="w-full h-full skeleton rounded-xl" />
            ) : pipelineData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-alita-gray-300 text-sm font-bold">Tidak ada data</div>
            ) : (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#EBEBEF" />
                    <XAxis 
                      type="number" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8A8A99', fontSize: 11, fontWeight: 600 }} 
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#4E4E5C', fontSize: 11, fontWeight: 700 }} 
                      width={130}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,122,0,0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
                      itemStyle={{ color: '#0f0f0f', fontWeight: 'bold' }}
                      formatter={(value: any, name: any) => [`${value} Tim`, name]}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={45}>
                      <LabelList dataKey="value" position="right" fill="#4E4E5C" fontSize={13} fontWeight={800} />
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Demand Region Chart */}
        <div className="bg-alita-white rounded-2xl shadow-card border border-alita-gray-100/80 p-5 flex flex-col h-[280px]">
          <div className="mb-3">
            <h2 className="text-lg font-black text-alita-black tracking-tight leading-none mb-1">Top Demand Regions</h2>
            <p className="text-[11px] text-alita-gray-400 font-medium tracking-wide">Distribusi kebutuhan tim per provinsi dari SOW</p>
          </div>
          
          <div className="relative flex-1 w-full min-h-0">
            {loading ? (
              <div className="w-full h-full skeleton rounded-xl" />
            ) : provinceData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-alita-gray-300 text-sm font-bold">Tidak ada data region</div>
            ) : (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                        data={provinceData}
                        cx="65%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="demand"
                        nameKey="name"
                        stroke="none"
                        labelLine={false}
                        label={({
                          cx, cy, midAngle = 0, innerRadius, outerRadius, value
                        }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill="white" 
                              textAnchor="middle" 
                              dominantBaseline="central"
                              style={{ fontSize: '11px', fontWeight: 900 }}
                            >
                              {value}
                            </text>
                          );
                        }}
                      >
                        {provinceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
                      itemStyle={{ color: '#0f0f0f', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value} Tim`, "Kebutuhan"]}
                    />
                    <Legend 
                      layout="vertical" 
                      align="left" 
                      verticalAlign="middle"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', fontWeight: 700, color: '#4E4E5C', paddingRight: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
      </div>
      </div>

      {/* Action Center Section */}
      <div className="mt-4 bg-alita-white rounded-2xl shadow-card border border-alita-gray-100/80 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-alita-orange flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <h2 className="text-[15px] font-black text-alita-black tracking-tight leading-none mb-0.5">Action Center</h2>
            <p className="text-[10px] text-alita-gray-400 font-medium tracking-wide">Ringkasan tugas yang perlu ditindaklanjuti</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-alita-gray-100 rounded-xl p-3 flex items-start gap-3 hover:bg-alita-gray-50 transition-colors cursor-pointer group">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] group-hover:scale-125 transition-transform" />
            <div>
              <div className="text-2xl font-black text-alita-black tracking-tighter leading-none mb-1.5">
                {stats.sourcingCount || "0"}
              </div>
              <div className="text-xs font-bold text-alita-gray-500 uppercase tracking-wide">SOW Belum Memiliki Tim</div>
              <p className="text-[10px] text-alita-gray-400 mt-1">Status: SOURCING</p>
            </div>
          </div>
          
          <div className="border border-alita-gray-100 rounded-xl p-3 flex items-start gap-3 hover:bg-alita-gray-50 transition-colors cursor-pointer group">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] group-hover:scale-125 transition-transform" />
            <div>
              <div className="text-2xl font-black text-alita-black tracking-tighter leading-none mb-1.5">
                {stats.scheduledCount || "0"}
              </div>
              <div className="text-xs font-bold text-alita-gray-500 uppercase tracking-wide">Tim Menunggu Training</div>
              <p className="text-[10px] text-alita-gray-400 mt-1">Status: TRAINING_SCHEDULED</p>
            </div>
          </div>

          <div className="border border-alita-gray-100 rounded-xl p-3 flex items-start gap-3 hover:bg-alita-gray-50 transition-colors cursor-pointer group">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(255,122,0,0.5)] group-hover:scale-125 transition-transform" />
            <div>
              <div className="text-2xl font-black text-alita-black tracking-tighter leading-none mb-1.5">
                {stats.pendingCerts || "0"}
              </div>
              <div className="text-xs font-bold text-alita-gray-500 uppercase tracking-wide">Anggota Belum Bersertifikat</div>
              <p className="text-[10px] text-alita-gray-400 mt-1">Menunggu Penerbitan (PMO/HR)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
