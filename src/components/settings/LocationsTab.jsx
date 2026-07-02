import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, MoreHorizontal, MapPin, DoorOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function LocationsTab() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLoc, setEditLoc] = useState(null);
  const [defaultType, setDefaultType] = useState('site');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Location.list();
      data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name));
      setLocations(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sites = locations.filter((l) => l.type === 'site');
  const rooms = locations.filter((l) => l.type === 'room');
  const standaloneRooms = rooms.filter((r) => !r.parent_id || !sites.find((s) => s.id === r.parent_id));

  const handleDelete = async (loc) => {
    if (!confirm(`Delete "${loc.name}"?`)) return;
    try {
      await base44.entities.Location.delete(loc.id);
      setLocations((prev) => prev.filter((l) => l.id !== loc.id));
    } catch (err) { alert('Failed to delete location.'); }
  };

  const handleSave = async (data) => {
    try {
      if (editLoc) {
        const updated = await base44.entities.Location.update(editLoc.id, data);
        setLocations((prev) => prev.map((l) => (l.id === editLoc.id ? updated : l)));
      } else {
        const created = await base44.entities.Location.create({ ...data, sort_order: locations.length });
        setLocations((prev) => [...prev, created]);
      }
      setShowForm(false);
      setEditLoc(null);
    } catch (err) { alert('Failed to save location.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setEditLoc(null); setDefaultType('site'); setShowForm(true); }}>
          <Plus size={15} className="mr-1.5" />Add Church Location
        </Button>
        <Button variant="outline" onClick={() => { setEditLoc(null); setDefaultType('room'); setShowForm(true); }}>
          <Plus size={15} className="mr-1.5" />Add Room
        </Button>
      </div>

      {/* Sites */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={15} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900">Church Locations</h3>
          <span className="text-xs text-slate-400">({sites.length})</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading...</div>
          ) : sites.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No church locations yet. For multi-site churches, add each campus here so rooms can be assigned to them.
            </div>
          ) : (
            sites.map((site) => {
              const siteRooms = rooms.filter((r) => r.parent_id === site.id);
              return (
                <div key={site.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{site.name}</p>
                      <p className="text-xs text-slate-400">{[site.address, site.city, site.state, site.zip].filter(Boolean).join(', ') || 'No address'}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditLoc(site); setShowForm(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(site)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {siteRooms.length > 0 && (
                    <div className="mt-3 ml-4 space-y-1.5 border-l-2 border-slate-100 pl-4">
                      {siteRooms.map((room) => (
                        <div key={room.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DoorOpen size={13} className="text-slate-300" />
                            <div>
                              <span className="text-sm text-slate-700">{room.name}</span>
                              {room.capacity && <span className="text-xs text-slate-400 ml-2">Cap: {room.capacity}</span>}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-slate-100"><MoreHorizontal size={14} className="text-slate-400" /></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditLoc(room); setShowForm(true); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(room)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Standalone rooms (no parent site) */}
      {standaloneRooms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DoorOpen size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Rooms</h3>
            <span className="text-xs text-slate-400">({standaloneRooms.length})</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
            {standaloneRooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{room.name}</p>
                  <p className="text-xs text-slate-400">{room.description || (room.capacity ? `Capacity: ${room.capacity}` : 'Room')}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditLoc(room); setShowForm(true); }}>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(room)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <LocationForm
          location={editLoc}
          defaultType={defaultType}
          sites={sites}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditLoc(null); }}
        />
      )}
    </div>
  );
}

function LocationForm({ location, defaultType, sites, onSave, onClose }) {
  const [name, setName] = useState(location?.name || '');
  const [type, setType] = useState(location?.type || defaultType);
  const [parentId, setParentId] = useState(location?.parent_id || '');
  const [address, setAddress] = useState(location?.address || '');
  const [city, setCity] = useState(location?.city || '');
  const [state, setState] = useState(location?.state || '');
  const [zip, setZip] = useState(location?.zip || '');
  const [capacity, setCapacity] = useState(location?.capacity || '');
  const [description, setDescription] = useState(location?.description || '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{location ? 'Edit Location' : 'New Location'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus placeholder={type === 'site' ? 'e.g. Main Campus' : 'e.g. Sanctuary'} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Church Location (Site)</SelectItem>
                  <SelectItem value="room">Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === 'room' && sites.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Church Location (optional)</Label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="">Standalone (no parent site)</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {type === 'site' && (
            <>
              <div>
                <Label className="text-xs font-medium text-slate-600">Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs font-medium text-slate-600">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs font-medium text-slate-600">State</Label><Input value={state} onChange={(e) => setState(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs font-medium text-slate-600">ZIP</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1" /></div>
              </div>
            </>
          )}

          {type === 'room' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Capacity</Label>
              <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : '')} className="mt-1" placeholder="e.g. 150" />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} placeholder="Optional notes about this location" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({
              name, type,
              parent_id: type === 'room' ? (parentId || undefined) : undefined,
              address: type === 'site' ? (address || undefined) : undefined,
              city: type === 'site' ? (city || undefined) : undefined,
              state: type === 'site' ? (state || undefined) : undefined,
              zip: type === 'site' ? (zip || undefined) : undefined,
              capacity: type === 'room' ? (capacity || undefined) : undefined,
              description: description || undefined,
            })}
            disabled={!name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {location ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}