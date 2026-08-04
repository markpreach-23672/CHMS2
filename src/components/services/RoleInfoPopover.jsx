import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

export default function RoleInfoPopover({ position, role, children }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{position}</p>
            {role?.area && <p className="text-[11px] text-slate-400 mb-2">{role.area}</p>}
            {role?.description ? (
              <p className="text-xs text-slate-600 whitespace-pre-line">{role.description}</p>
            ) : (
              <p className="text-xs text-slate-400">No description yet.</p>
            )}
            {role?.requirements && (
              <>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-3 mb-1">Requirements</p>
                <p className="text-xs text-slate-600 whitespace-pre-line">{role.requirements}</p>
              </>
            )}
            {!role && (
              <p className="text-[11px] text-slate-400 mt-2">Add a matching role on the Volunteers page to show details and requirements here.</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}