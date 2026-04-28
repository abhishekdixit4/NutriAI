import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EvalSummary = {
  profiles_evaluated: number;
  coverage_percent: number;
  constraint_compliance_percent: number;
  avg_recommendations_per_profile: number;
  note: string;
};

const ResearchResults = () => {
  const [summary, setSummary] = useState<EvalSummary | null>(null);

  useEffect(() => {
    fetch("/evaluation-summary.json")
      .then((r) => r.json())
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold font-display">Research Evaluation Summary</h1>
        <p className="text-muted-foreground">
          This page mirrors paper-style evaluation output for 200 synthetic profiles and recommendation compliance.
        </p>

        {summary ? (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Profiles Evaluated</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.profiles_evaluated}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recommendation Coverage</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.coverage_percent}%</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Constraint Compliance</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.constraint_compliance_percent}%</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Avg Suggestions/Profile</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.avg_recommendations_per_profile}</CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Note</CardTitle></CardHeader>
              <CardContent>{summary.note}</CardContent>
            </Card>
          </div>
        ) : (
          <Card><CardContent className="p-6">Could not load evaluation summary.</CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default ResearchResults;

