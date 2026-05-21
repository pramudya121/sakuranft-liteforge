import { useEffect, useRef, useState } from "react";
import { Plus, Check, Loader2, Layers, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export type Collection = {
  id: string;
  contract_address: string;
  name: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  verified: boolean;
};

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `col-${Date.now()}`;
}

export function CollectionPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (slug: string | null, col: Collection | null) => void;
}) {
  const [cols, setCols] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", logo_url: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("collections_metadata")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setCols((data ?? []) as Collection[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createCollection() {
    if (!form.name.trim()) return toast.error("Collection name required");
    setCreating(true);
    const slug = slugify(form.name);
    const { data, error } = await supabase
      .from("collections_metadata")
      .insert({
        contract_address: slug,
        name: form.name.trim(),
        description: form.description.trim() || null,
        logo_url: form.logo_url.trim() || null,
      })
      .select()
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Collection created");
    setOpenCreate(false);
    setForm({ name: "", description: "", logo_url: "" });
    await load();
    if (data) onChange(data.contract_address, data as Collection);
  }

  const selected = cols.find((c) => c.contract_address === value) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" /> Collection
        </label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => setOpenCreate(true)}>
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {loading ? (
        <div className="h-20 rounded-xl border bg-background/40 flex items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading collections…
        </div>
      ) : cols.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="w-full p-4 rounded-xl border border-dashed border-primary/40 text-sm text-muted-foreground hover:border-primary hover:bg-accent/40 transition"
        >
          No collections yet. <span className="text-primary font-semibold">+ Create your first collection</span>
        </button>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition ${
              value === null ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/40 hover:border-primary/60"
            }`}
          >
            None
          </button>
          {cols.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.contract_address, c)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition ${
                value === c.contract_address ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/40 hover:border-primary/60"
              }`}
            >
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary/40 to-accent/40" />
              )}
              <span className="max-w-[10rem] truncate">{c.name ?? c.contract_address}</span>
              {value === c.contract_address && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}

      {selected?.description && (
        <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{selected.description}</p>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="gradient-text text-xl">Create Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Winter Bloom Series" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Logo URL</label>
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short story about this collection" className="mt-1 resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpenCreate(false)} disabled={creating}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground" onClick={createCollection} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Create</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
