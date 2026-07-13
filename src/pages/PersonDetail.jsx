import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Pencil, Trash2, Tag as TagIcon, Plus, X, Users, DollarSign, Clock, Heart, MessageSquare } from 'lucide-react';
import moment from 'moment';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import PersonForm from '@/components/people/PersonForm';
import TagPicker from '@/components/people/TagPicker';
import TextMessageDialog from '@/components/people/TextMessageDialog';
import AddFamilyMemberDialog from '@/components/people/AddFamilyMemberDialog';
import EmailPersonStatementDialog from '@/components/people/EmailPersonStatementDialog';

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [tags, setTags] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [family, setFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [textRecipient, setTextRecipient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [volunteerRoles, setVolunteerRoles] = useState([]);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showEmailStatement, setShowEmailStatement] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, t, cf, fldrs, vroles] = await Promise.all([
        base44.entities.Person.get(id),
        base44.entities.Tag.list(),
        base44.entities.CustomField.list(),
        base44.entities.TagFolder.list(),
        base44.entities.VolunteerRole.list(),
      ]);
      setPerson(p);
      setTags(t);
      setCustomFields(cf);
      setFolders(fldrs);
      setVolunteerRoles(vroles);

      if (p.family_id) {
        const [fam, members] = await Promise.all([
          base44.entities.Family.get(p.family_id).catch(() => null),
          base44.entities.Person.filter({ family_id: p.family_id }),
        ]);
        setFamily(fam);
        setFamilyMembers(members);
      } else {
        setFamily(null);
        setFamilyMembers([]);
      }

      const dons = await base44.entities.Donation.filter({ person_id: p.id }).catch(() => []);
      setDonations(dons);
      const ens = await base44.entities.WorkflowEnrollment.filter({ person_id: p.id }).catch(() => []);
      setEnrollments(ens);
      const me = await base44.auth.me().catch(() => null);
      setCurrentUser(me);
    } catch {
      setPerson(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (!confirm(`Delete ${person.first_name} ${person.last_name}?`)) return;
    try {
      await base44.entities.Person.delete(person.id);
      navigate('/people');
    } catch (err) {
      alert('Failed to delete person.');
    }
  };

  const toggleTag = async (tagId) => {
    const currentTags = person.tag_ids || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((t) => t !== tagId)
      : [...currentTags, tagId];
    try {
      await base44.entities.Person.update(person.id, { tag_ids: newTags });
      setPerson({ ...person, tag_ids: newTags });
    } catch (err) {
      alert('Failed to update tags.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="h-32 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <p className="text-slate-400 mb-4">Person not found.</p>
        <Link to="/people">
          <Button variant="outline">Back to People</Button>
        </Link>
      </div>
    );
  }

  const personTags = (person.tag_ids || []).map((tid) => tags.find((t) => t.id === tid)).filter(Boolean);
  const personVolunteerRoles = (person.volunteer_role_ids || []).map((rid) => volunteerRoles.find((r) => r.id === rid)).filter(Boolean);
  const fullName = `${person.first_name} ${person.last_name}`;
  const totalGiving = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const ytdGiving = donations
    .filter((d) => moment(d.donation_date).year() === moment().year())
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const visibleCustomFields = customFields.filter(f => !f.is_private || currentUser?.role === 'admin');
  const customFieldSections = {};
  visibleCustomFields.forEach(f => {
    const sec = f.section || 'Other';
    if (!customFieldSections[sec]) customFieldSections[sec] = [];
    customFieldSections[sec].push(f);
  });

  const roleLabel = {
    head_of_household: 'Head of Household',
    spouse: 'Spouse',
    adult: 'Adult',
    child: 'Child',
    unassigned: 'Unassigned',
    other: 'Other',
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/people" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} />
        Back to People
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {person.photo_url ? (
              <img src={person.photo_url} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-slate-400">
                {person.first_name?.[0]}{person.last_name?.[0]}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                person.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                person.status === 'visitor' ? 'bg-amber-50 text-amber-600' :
                person.status === 'member' ? 'bg-indigo-50 text-indigo-600' :
                'bg-slate-50 text-slate-500'
              }`}>
                {person.status}
              </span>
              {person.family_role && (
                <span className="text-xs text-slate-500">{roleLabel[person.family_role]}</span>
              )}
              {person.gender && (
                <span className="text-xs text-slate-500 capitalize">{person.gender}</span>
              )}
              {person.marital_status && (
                <span className="text-xs text-slate-500 capitalize">{person.marital_status}</span>
              )}
            </div>
            {/* Contact info */}
            <div className="flex flex-wrap gap-4 mt-3">
              {person.email && (
                <span className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" />
                  {person.email}
                </span>
              )}
              {person.phone && (
                <span className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" />
                  {person.phone}
                  <a href={`tel:${person.phone}`} className="ml-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title={`Call ${person.phone}`}>
                    <Phone size={12} />
                  </a>
                  <button
                    onClick={() => setTextRecipient({ name: fullName, phone: person.phone })}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                    title={`Text ${person.phone}`}
                  >
                    <MessageSquare size={12} />
                  </button>
                </span>
              )}
              {person.mobile && (
                <span className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" />
                  {person.mobile}
                  <a href={`tel:${person.mobile}`} className="ml-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title={`Call ${person.mobile}`}>
                    <Phone size={12} />
                  </a>
                  <button
                    onClick={() => setTextRecipient({ name: fullName, phone: person.mobile })}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                    title={`Text ${person.mobile}`}
                  >
                    <MessageSquare size={12} />
                  </button>
                </span>
              )}
              {person.birth_date && (
                <span className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  {moment(person.birth_date).format('MMM D, YYYY')}
                </span>
              )}
            </div>
            {(person.address || person.city) && (
              <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-2">
                <MapPin size={14} className="text-slate-400" />
                {[person.address, person.city, person.state, person.zip].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil size={14} className="mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-200" onClick={handleDelete}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Tags & Custom Fields */}
        <div className="space-y-6">
          {/* Milestones */}
          {(person.first_visit_date || person.baptism_date || person.membership_date) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Milestones</h3>
              <div className="space-y-2">
                {person.first_visit_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">First Visit</span>
                    <span className="text-slate-900 font-medium">{moment(person.first_visit_date).format('MMM D, YYYY')}</span>
                  </div>
                )}
                {person.baptism_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Baptism</span>
                    <span className="text-slate-900 font-medium">{moment(person.baptism_date).format('MMM D, YYYY')}</span>
                  </div>
                )}
                {person.membership_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Membership</span>
                    <span className="text-slate-900 font-medium">{moment(person.membership_date).format('MMM D, YYYY')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Volunteer Roles */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Heart size={15} className="text-rose-400" />
                Volunteer Roles
              </h3>
              <button onClick={() => setShowEdit(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {personVolunteerRoles.length === 0 ? (
                <p className="text-xs text-slate-400">No volunteer roles assigned.</p>
              ) : (
                personVolunteerRoles.map((role) => (
                  <Link
                    key={role.id}
                    to="/volunteers"
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                  >
                    <Heart size={11} />
                    {role.name}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TagIcon size={15} className="text-slate-400" />
                Tags
              </h3>
              <button
                onClick={() => setShowTagPicker(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {personTags.length === 0 ? (
                <p className="text-xs text-slate-400">No tags assigned.</p>
              ) : (
                personTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                  >
                    {tag.name}
                    <button onClick={() => toggleTag(tag.id)} className="hover:opacity-70">
                      <X size={11} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Custom Fields by Section */}
          {Object.entries(customFieldSections).map(([sectionName, fields]) => (
            <div key={sectionName} className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{sectionName}</h3>
              <div className="space-y-2.5">
                {fields.map((field) => {
                  const val = person.custom_fields?.[field.name];
                  const display = Array.isArray(val) ? val.join(', ') : val;
                  return (
                    <div key={field.id} className="flex justify-between text-sm">
                      <span className="text-slate-500">{field.name}{field.is_private && <span className="ml-1 text-rose-400">🔒</span>}</span>
                      <span className="text-slate-900 font-medium text-right">{display || '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          {person.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{person.notes}</p>
            </div>
          )}
        </div>

        {/* Right column - Family & Giving */}
        <div className="lg:col-span-2 space-y-6">
          {/* Family */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users size={15} className="text-slate-400" />
                Family
              </h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddFamily(true)} className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                <Plus size={13} className="mr-1" />
                Add Family Member
              </Button>
            </div>
            {family ? (
              <div>
                <p className="text-sm font-medium text-slate-900 mb-3">{family.family_name} Family</p>
                {familyMembers.length > 0 ? (
                  <div className="space-y-2">
                    {familyMembers.map((member) => (
                      <Link
                        key={member.id}
                        to={`/people/${member.id}`}
                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors ${member.id === person.id ? 'bg-indigo-50/50' : ''}`}
                      >
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-xs font-medium text-slate-500">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {member.first_name} {member.last_name}
                            {member.id === person.id && <span className="text-xs text-indigo-600 ml-1">(you)</span>}
                          </p>
                          <p className="text-xs text-slate-400">{roleLabel[member.family_role] || 'Family Member'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No family members yet.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Not part of a family yet. Add a member to start one.</p>
            )}
          </div>

          {/* Giving */}
          {currentUser?.role === 'admin' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign size={15} className="text-slate-400" />
                Giving History
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowEmailStatement(true)}>
                  <Mail size={12} className="mr-1" />
                  Email Report
                </Button>
                <Link to={`/giving/statement/${person.id}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Print Report
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">This Year ({moment().year()})</p>
                <p className="text-lg font-bold text-slate-900">
                  ${ytdGiving.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">All Time</p>
                <p className="text-lg font-bold text-slate-900">
                  ${totalGiving.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            {donations.length > 0 ? (
              <div className="space-y-2">
                {donations.map((don) => (
                  <div key={don.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">${don.amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">
                        {moment(don.donation_date).format('MMM D, YYYY')} · {don.method}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 capitalize">{don.method}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No donations recorded.</p>
            )}
          </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <Clock size={15} className="text-slate-400" />
              Activity Timeline
            </h3>
            <div className="space-y-1">
              {(() => {
                const events = [];
                if (person.created_date) events.push({ date: person.created_date, label: 'Profile created', icon: '👤' });
                enrollments.forEach(e => events.push({ date: e.enrolled_date, label: 'Enrolled in workflow', icon: '📋' }));
                if (currentUser?.role === 'admin') {
                  donations.forEach(d => events.push({ date: d.donation_date, label: `Gave $${(d.amount || 0).toFixed(2)}`, icon: '💰' }));
                }
                events.sort((a, b) => moment(b.date).diff(moment(a.date)));
                if (events.length === 0) return <p className="text-xs text-slate-400">No activity recorded.</p>;
                return events.slice(0, 15).map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm">{e.icon}</span>
                    <span className="text-sm text-slate-700 flex-1">{e.label}</span>
                    <span className="text-xs text-slate-400">{moment(e.date).format('MMM D, YYYY')}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {showEdit && (
        <PersonForm
          person={person}
          onSave={(saved) => {
            setPerson(saved);
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Tag Picker */}
      {showTagPicker && (
        <TagPicker
          person={person}
          tags={tags}
          folders={folders}
          onToggleTag={toggleTag}
          onTagCreated={(tag) => setTags(prev => [...prev, tag])}
          onFolderCreated={(folder) => setFolders(prev => [...prev, folder])}
          onClose={() => setShowTagPicker(false)}
        />
      )}

      {textRecipient && (
        <TextMessageDialog
          recipients={[textRecipient]}
          onClose={() => setTextRecipient(null)}
        />
      )}

      {showEmailStatement && (
        <EmailPersonStatementDialog
          person={person}
          onClose={() => setShowEmailStatement(false)}
        />
      )}

      {showAddFamily && (
        <AddFamilyMemberDialog
          currentPerson={person}
          onClose={() => setShowAddFamily(false)}
          onAdded={() => { setShowAddFamily(false); loadData(); }}
        />
      )}
    </div>
  );
}