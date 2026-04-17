import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, User, Send, MessageSquareHeart, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CONTACT_EMAIL = "abhishekdixit597@gmail.com";
const CONTACT_NAME = "Abhishek Dixit";
const CONTACT_ENDPOINT =
  import.meta.env.VITE_CONTACT_FORM_ENDPOINT?.trim() || "https://formsubmit.co/ajax/abhishekdixit597@gmail.com";

const Settings = () => {
  const [sending, setSending] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    issueType: "general-feedback",
    message: "",
  });

  const update = (key: "name" | "email" | "issueType" | "message", value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill all fields.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: `Issue Type: ${form.issueType}\n\n${form.message.trim()}`,
          _subject: `NutriAI Contact - ${form.issueType}`,
          _captcha: "false",
          _template: "table",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === "false") {
        throw new Error(data?.message || "Failed to send message.");
      }

      toast.success("Message sent successfully.");
      setForm({ name: "", email: "", issueType: "general-feedback", message: "" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-7">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <Card className="shadow-elevated border-primary/15 overflow-hidden">
          <div className="gradient-hero p-6 text-primary-foreground">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold">Contact</h1>
                <p className="text-primary-foreground/90 mt-1">
                  Raise issues, request features, or share feedback.
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>
          {showWelcome ? (
            <CardContent className="p-6 space-y-5">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h2 className="font-display text-2xl text-foreground mb-2">Welcome to Contact Section</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Thanks for visiting NutriAI. You can use this section to raise an issue, request a new feature,
                  report food detection problems, or share any feedback directly with the project owner.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Contact Details
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {CONTACT_NAME}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {CONTACT_EMAIL}
                </p>
              </div>
              <Button onClick={() => setShowWelcome(false)} className="gradient-hero text-primary-foreground shadow-warm">
                Continue to Contact Form
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <MessageSquareHeart className="w-5 h-5 text-primary" />
                  Contact Form
                </CardTitle>
                <CardDescription>
                  Contact the project owner directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Contact Details
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {CONTACT_NAME}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {CONTACT_EMAIL}
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
                  <div>
                    <Label className="font-medium">Your Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Enter your name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="font-medium">Your Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="font-medium">Issue Type</Label>
                    <Select value={form.issueType} onValueChange={(value) => update("issueType", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug-report">Bug Report</SelectItem>
                        <SelectItem value="feature-request">Feature Request</SelectItem>
                        <SelectItem value="food-detection-issue">Food Detection Issue</SelectItem>
                        <SelectItem value="account-support">Account Support</SelectItem>
                        <SelectItem value="general-feedback">General Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="font-medium">Message</Label>
                    <textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Write your query or feedback..."
                      className="mt-1 w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={sending} className="gradient-hero text-primary-foreground gap-2 shadow-warm w-full sm:w-auto">
                      <Send className="w-4 h-4" />
                      {sending ? "Sending..." : "Send Message"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowWelcome(true)}>
                      Back to Welcome
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Settings;
