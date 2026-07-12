import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlansTab from '@/components/services/PlansTab';
import SongsTab from '@/components/services/SongsTab';
import TeamsTab from '@/components/services/TeamsTab';
import ServiceTypesTab from '@/components/services/ServiceTypesTab';
import VolunteerReportTab from '@/components/services/VolunteerReportTab';
import NotificationSettingsTab from '@/components/services/NotificationSettingsTab';
import MediaLibraryTab from '@/components/services/MediaLibraryTab';

export default function Services() {
  const [churchId, setChurchId] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [user, p] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Person.list('-created_date', 500),
      ]);
      setChurchId(user?.church_id || user?.data?.church_id || '');
      setPeople(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="p-8 text-sm text-slate-400">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Service Planning</h1>
        <p className="text-slate-500 text-sm mt-1">Plan worship services, build teams, and schedule your volunteers.</p>
      </div>
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="types">Service Types</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4">
          <PlansTab churchId={churchId} people={people} />
        </TabsContent>
        <TabsContent value="songs" className="mt-4">
          <SongsTab churchId={churchId} />
        </TabsContent>
        <TabsContent value="media" className="mt-4">
          <MediaLibraryTab churchId={churchId} />
        </TabsContent>
        <TabsContent value="teams" className="mt-4">
          <TeamsTab churchId={churchId} people={people} />
        </TabsContent>
        <TabsContent value="types" className="mt-4">
          <ServiceTypesTab churchId={churchId} />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <VolunteerReportTab people={people} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationSettingsTab churchId={churchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}