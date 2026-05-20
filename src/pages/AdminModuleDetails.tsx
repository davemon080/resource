import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, Module } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactPlayer from 'react-player';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  FileText, 
  Loader2,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const PlayerComponent = ReactPlayer as any;

function Player({ url, controls, style, ...props }: any) {
  const isLocalOrBlob = !url || url.startsWith('blob:') || url.startsWith('/') || url.startsWith('data:');

  if (isLocalOrBlob) {
    return (
      <video
        src={url}
        controls={controls}
        playsInline
        className="w-full h-full object-contain bg-zinc-950"
        style={style}
      />
    );
  }

  return (
    <PlayerComponent
      url={url}
      controls={controls}
      width="100%"
      height="100%"
      style={style}
      {...props}
    />
  );
}

enum ModuleType {
  VIDEO = 'video',
  PDF = 'pdf'
}

export default function AdminModuleDetails() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit State
  const [editForm, setEditForm] = useState<Partial<Module>>({});

  useEffect(() => {
    async function fetchModule() {
      if (!moduleId) return;
      try {
        const modules = await apiService.getModules();
        const data = modules.find(m => m.id === moduleId);
        if (data) {
          setModule(data);
          setEditForm(data);
        } else {
          toast.error('Module not found');
          navigate('/admin');
        }
      } catch (error) {
        console.error('Error fetching module:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchModule();
  }, [moduleId, navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleId) return;
    setSaving(true);
    try {
      await apiService.updateModule(moduleId, editForm);
      setModule({ ...module, ...editForm } as Module);
      toast.success('Module updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update module');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!moduleId || !confirm('Are you sure you want to delete this module permanently?')) return;
    try {
      await apiService.deleteModule(moduleId);
      toast.success('Module deleted');
      navigate('/admin');
    } catch (error) {
      toast.error('Failed to delete module');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnailUrl' | 'pdfUrl' | 'videoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 50MB Limit as requested
    const limit = 50 * 1024 * 1024;
    
    if (file.size > limit) {
      toast.error('File size must be less than 50MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm(prev => ({ ...prev, [field]: reader.result as string }));
      toast.success('File ready for update');
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (!module) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 font-bold" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="font-bold">Edit Content</Button>
          ) : (
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="font-bold">Cancel Editing</Button>
          )}
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!isEditing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black tracking-tight text-zinc-900">{module.title}</h1>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    module.type === ModuleType.VIDEO ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {module.type}
                  </span>
                </div>
                <p className="text-zinc-500 font-medium text-lg leading-relaxed">{module.description}</p>
              </div>

              {module.type === ModuleType.VIDEO ? (
                <Card className="overflow-hidden border-2 border-zinc-100 shadow-none bg-zinc-950">
                  <div className="aspect-video bg-zinc-900 group relative">
                    {module.videoUrl ? (
                      <Player 
                        url={module.videoUrl} 
                        controls 
                        width="100%" 
                        height="100%" 
                        style={{ position: 'absolute', top: 0, left: 0 }}
                        config={{
                          file: {
                            attributes: {
                              style: { width: '100%', height: '100%' }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Video Source</p>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-8 border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center gap-4">
                  <FileText className="w-12 h-12 text-zinc-300" />
                  <div className="text-center">
                    <h4 className="font-bold text-zinc-900">PDF Content Prepared</h4>
                    <p className="text-sm text-zinc-500">The module content is set as a document.</p>
                  </div>
                  {module.pdfUrl && (
                    <Button variant="outline" className="gap-2 font-bold" onClick={() => {
                      const link = document.createElement('a');
                      link.href = module.pdfUrl!;
                      link.download = `${module.title}.pdf`;
                      link.click();
                    }}>
                      Download PDF <FileCheck className="w-4 h-4" />
                    </Button>
                  )}
                </Card>
              )}
            </motion.div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Edit Module Content</CardTitle>
                <CardDescription>Modify the details and media for this training module.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Title</Label>
                    <Input 
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Description</Label>
                    <Input 
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {module.type === ModuleType.VIDEO ? (
                    <div className="space-y-4">
                       <Label className="font-bold text-zinc-900">Update Video Source</Label>
                       <Tabs defaultValue="url" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="url">URL</TabsTrigger>
                            <TabsTrigger value="file">Local File</TabsTrigger>
                          </TabsList>
                          <TabsContent value="url" className="pt-2">
                            <Input 
                              placeholder="YouTube/Vimeo URL" 
                              value={editForm.videoUrl?.startsWith('data:') ? '' : editForm.videoUrl}
                              onChange={(e) => setEditForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                            />
                          </TabsContent>
                          <TabsContent value="file" className="pt-2">
                            <div className="flex flex-col gap-2">
                              <Input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'videoUrl')} />
                              <p className="text-[10px] text-zinc-500 italic">50MB Limit. Warning: Firestore documents strictly limit to 1MB total size.</p>
                            </div>
                          </TabsContent>
                       </Tabs>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="font-bold">Update PDF File</Label>
                      <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'pdfUrl')} />
                    </div>
                  )}

                  <div className="space-y-2 pt-4">
                    <Label className="font-bold">Thumbnail Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'thumbnailUrl')} />
                  </div>

                  <Button type="submit" className="w-full gap-2 font-bold" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating Module...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-none bg-zinc-900 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Module Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Type</span>
                <span className="font-bold">{module.type.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Order</span>
                <span className="font-bold">Pos {module.order + 1}</span>
              </div>
              <div className="pt-4">
                 <div className="flex items-center gap-2 text-yellow-500 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-black uppercase">Quota Notice</span>
                 </div>
                 <p className="text-[10px] text-zinc-500 leading-tight">
                   Training content is stored in your PostgreSQL database.
                 </p>
              </div>
            </CardContent>
          </Card>

          {module.thumbnailUrl && (
            <Card className="overflow-hidden border-2 border-zinc-100">
              <img src={module.thumbnailUrl} className="w-full aspect-video object-cover" alt="Thumbnail" />
              <div className="p-3 text-center text-xs font-bold text-zinc-500 bg-zinc-50">Current Thumbnail</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
