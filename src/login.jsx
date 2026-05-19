import React, { useState } from 'react';

export default function Login() {
  const [role, setRole] = useState('operator'); // tracks 'operator' or 'household'

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-[#F2ECE1]">
      
      {/* LEFT SIDE: HERO IMAGE & BRANDING */}
      <div 
        className="relative w-full md:w-1/2 min-h-[45vh] md:min-h-screen flex flex-col justify-end p-8 md:p-16 bg-cover bg-center text-white"
        style={{ backgroundImage: `url('/solarbackground.jpg')` }}
      >
        {/* Ambient overlay gradient to guarantee white text remains legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"></div>
        
        {/* Branding Content */}
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zm0-10c.41 0 .75-.34.75-.75V3c0-.41-.34-.75-.75-.75s-.75.34-.75.75v1.25c0 .41.34.75.75.75zm0 14c-.41 0-.75.34-.75.75V21c0 .41.34.75.75.75s.75-.34.75-.75v-1.25c0-.41-.34-.75-.75-.75zm8.25-7.25h-1.25c-.41 0-.75.34-.75.75s.34.75.75.75h1.25c.41 0 .75-.34.75-.75s-.34-.75-.75-.75zM5 12c0-.41-.34-.75-.75-.75H3c-.41 0-.75.34-.75.75s.34.75.75.75h1.25c.41 0 .75-.34.75-.75zm13.22-6.22c-.3-.3-.77-.3-1.06 0l-.88.88c-.3.3-.3.77 0 1.06s.77.3 1.06 0l.88-.88c.3-.3.3-.77 0-1.06zm-11.31 11.31c-.3-.3-.77-.3-1.06 0l-.88.88c-.3.3-.3.77 0 1.06s.77.3 1.06 0l.88-.88c.3-.3.3-.77 0-1.06zm1.06-11.31c-.3-.3-.3-.77 0-1.06l.88-.88c.3-.3.77-.3 1.06 0s.3.77 0 1.06l-.88.88c-.3.3-.77.3-1.06 0zm11.31 11.31c-.3-.3-.3-.77 0-1.06l.88-.88c.3-.3.77-.3 1.06 0s.3.77 0 1.06l-.88.88c-.3.3-.77.3-1.06 0z" />
            </svg>
            <h1 className="text-xl font-bold tracking-wide font-sans">
              Solar<span className="text-amber-400">KapitBahay</span>
            </h1>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold leading-tight font-serif mb-6 tracking-wide">
            Sharing the sun, <br />together
          </h2>
          
          <div className="text-[11px] uppercase tracking-widest opacity-75 space-y-1 font-sans border-t border-white/20 pt-4">
            <p className="font-semibold">Solar Energy Management System</p>
            <p>Barangay-Level Distribution Platform</p>
            <p className="text-amber-400/90 font-medium">Simulation Mode · v0.9-Alpha</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: LOGIN FORM */}
      <div className="w-full md:w-1/2 min-h-[55vh] md:min-h-screen flex flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          
          {/* Custom Role Selector Switch */}
          <div className="flex bg-[#E5DDD0] p-1 rounded-xl border border-stone-400/30 mb-10 shadow-inner">
            <button
              type="button"
              onClick={() => setRole('operator')}
              className={`flex-1 py-2.5 text-xs uppercase tracking-wider font-semibold font-sans rounded-lg transition-all duration-300 ${
                role === 'operator' 
                  ? 'bg-white text-stone-900 shadow-md' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Barangay Operator
            </button>
            <button
              type="button"
              onClick={() => setRole('household')}
              className={`flex-1 py-2.5 text-xs uppercase tracking-wider font-semibold font-sans rounded-lg transition-all duration-300 ${
                role === 'household' 
                  ? 'bg-white text-stone-900 shadow-md' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Household Member
            </button>
          </div>

          {/* Dynamic Headers */}
          <div className="mb-8">
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold font-sans block mb-1">
              {role === 'operator' ? 'Operator Access' : 'Resident Access'}
            </span>
            <h3 className="text-4xl text-stone-900 font-medium font-serif leading-tight">
              Welcome online, <br />
              <span className="text-emerald-800 italic font-semibold">
                {role === 'operator' ? 'operator.' : 'member.'}
              </span>
            </h3>
          </div>

          {/* Inputs Form */}
          <form className="space-y-5 font-sans" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-500 font-bold mb-2">
                Username
              </label>
              <input 
                type="text" 
                placeholder="Enter your username"
                className="w-full px-4 py-3 rounded-xl border border-stone-400/50 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/40 focus:border-emerald-800 transition shadow-sm placeholder:text-stone-400"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-500 font-bold mb-2">
                Password
              </label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-stone-400/50 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/40 focus:border-emerald-800 transition shadow-sm placeholder:text-stone-400"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 mt-4 bg-emerald-800 text-white font-medium text-sm tracking-wide rounded-xl hover:bg-emerald-900 active:scale-[0.99] transition-all duration-200 shadow-md shadow-emerald-900/10"
            >
              Sign in to Dashboard
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}