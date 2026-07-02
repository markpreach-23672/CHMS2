import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReportBuilder from '@/components/reports/ReportBuilder';
import PrebuiltReports from '@/components/reports/PrebuiltReports';
import MailingLabels from '@/components/reports/MailingLabels';
import ChurchDirectory from '@/components/reports/ChurchDirectory';
import { FileText, BarChart3, Mail, BookOpen } from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Person.list(),
      base44.entities.Tag.list(),
      base44.entities.SavedSearch.list(),
      base44.entities.CustomField.list(),
      base44.entities.Family.list(),
      base44.entities.Donation.list('-donation_date', 1000),
      base44.entities.Fund.list(),
      base44.entities.ReportDefinition.list(),
      base44.entities.Church.list(),
    ])
      .then(([people, tags, savedSearches, customFields, families, donations, funds, reports, churches]) => {
        setData({ people, tags, savedSearches, customFields, families, donations, funds, church: churches[0] });
        setSavedReports(reports);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading reports…</div>;
  if (!data) return <div className="p-8 text-center text-sm text-slate-400">Failed to load data.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Build custom reports, run prebuilt analytics, generate labels and directories.</p>
      </div>
      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder"><FileText size={14} className="mr-1.5" />Report Builder</TabsTrigger>
          <TabsTrigger value="prebuilt"><BarChart3 size={14} className="mr-1.5" />Prebuilt Reports</TabsTrigger>
          <TabsTrigger value="labels"><Mail size={14} className="mr-1.5" />Mailing Labels</TabsTrigger>
          <TabsTrigger value="directory"><BookOpen size={14} className="mr-1.5" />Church Directory</TabsTrigger>
        </TabsList>
        <TabsContent value="builder" className="mt-4">
          <ReportBuilder {...data} savedReports={savedReports} onReportsChanged={setSavedReports} />
        </TabsContent>
        <TabsContent value="prebuilt" className="mt-4">
          <PrebuiltReports {...data} />
        </TabsContent>
        <TabsContent value="labels" className="mt-4">
          <MailingLabels {...data} />
        </TabsContent>
        <TabsContent value="directory" className="mt-4">
          <ChurchDirectory {...data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}