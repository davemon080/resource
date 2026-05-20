import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, Module, UserProgress, ModuleType } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Trash2, 
  Pencil,
  Video, 
  FileText, 
  Users, 
  LayoutDashboard, 
  Search,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  unlockedModuleIndex: number;
  completed?: boolean;
}

export default function AdminDashboard() {
  const [modules, setModules] = useState<Module[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // New Module Form State
  const [newModule, setNewModule] = useState<Partial<Module>>({
    title: '',
    description: '',
    type: ModuleType.VIDEO,
    videoUrl: '',
    pdfUrl: '',
    thumbnailUrl: '',
    order: 0
  });

  const fetchModules = async () => {
    try {
      const data = await apiService.getModules();
      setModules(data);
    } catch (err) {
      toast.error('Failed to load modules');
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await apiService.getAdminUsers();
      setStudents(data);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchModules();
    fetchStudents();
  }, []);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const id = editingModuleId || `mod-${Date.now()}`;
    const moduleToSave = { 
      ...newModule, 
      id,
      order: editingModuleId ? modules.find(m => m.id === editingModuleId)?.order || 0 : modules.length 
    };
    
    try {
      if (editingModuleId) {
        await apiService.updateModule(id, moduleToSave);
        toast.success('Module updated successfully!');
      } else {
        await apiService.createModule(moduleToSave);
        toast.success('Module created successfully!');
      }
      setIsAddingModule(false);
      setEditingModuleId(null);
      setNewModule({
        title: '',
        description: '',
        type: ModuleType.VIDEO,
        videoUrl: '',
        pdfUrl: '',
        thumbnailUrl: '',
        order: 0
      });
      fetchModules(); // Refresh list
    } catch (error) {
      toast.error(editingModuleId ? 'Failed to update module' : 'Failed to create module');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditModule = (mod: Module) => {
    setNewModule({
      title: mod.title,
      description: mod.description,
      type: mod.type,
      videoUrl: mod.videoUrl || '',
      pdfUrl: mod.pdfUrl || '',
      thumbnailUrl: mod.thumbnailUrl || '',
      order: mod.order
    });
    setEditingModuleId(mod.id);
    setIsAddingModule(true);
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;
    try {
      await apiService.deleteModule(id);
      toast.success('Module deleted');
      fetchModules(); // Refresh
    } catch (error) {
      toast.error('Failed to delete module');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnailUrl' | 'pdfUrl' | 'videoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 200MB Limit for videos, 50MB for other assets (PDFs, thumbnails)
    const limit = field === 'videoUrl' ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
    const limitName = field === 'videoUrl' ? '200MB' : '50MB';
    
    if (file.size > limit) {
      toast.error(`File size must be less than ${limitName}.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewModule(prev => ({ ...prev, [field]: reader.result as string }));
      toast.success('File ready');
    };
    reader.readAsDataURL(file);
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-zinc-900">Admin Portal</h2>
          <p className="text-zinc-500 font-medium">Control center for curriculum and student management.</p>
        </div>
      </header>

      <Tabs defaultValue="curriculum" className="space-y-6">
        <TabsList className="bg-transparent border-b border-zinc-200 rounded-none w-full justify-start h-auto p-0 gap-8">
          <TabsTrigger 
            value="curriculum" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent px-0 pb-4 h-auto font-bold text-lg"
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Curriculum
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="students" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent px-0 pb-4 h-auto font-bold text-lg"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Students
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-zinc-900">Training Modules</h3>
            <Button onClick={() => setIsAddingModule(true)} className="gap-2 font-bold h-10 px-6">
              <Plus className="w-4 h-4" />
              Add Module
            </Button>
          </div>

          <AnimatePresence>
            {isAddingModule && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-2 border-dashed border-zinc-200 bg-zinc-50/50">
                  <CardHeader>
                    <CardTitle>{editingModuleId ? 'Edit Module' : 'New Module Details'}</CardTitle>
                    <CardDescription>{editingModuleId ? 'Update the details for this module.' : 'Fill in the info for the new course content.'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateModule} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold">Title</Label>
                          <Input 
                            required 
                            value={newModule.title}
                            onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Type</Label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                            value={newModule.type}
                            onChange={(e) => setNewModule(prev => ({ ...prev, type: e.target.value as ModuleType }))}
                          >
                            <option value={ModuleType.VIDEO}>Video</option>
                            <option value={ModuleType.PDF}>PDF Document</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="font-bold">Description</Label>
                          <Input 
                            value={newModule.description}
                            onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>

                        {newModule.type === ModuleType.VIDEO ? (
                          <div className="md:col-span-2 space-y-2">
                            <Label className="font-bold">Video (Local MP4 or YouTube URL)</Label>
                            <Tabs defaultValue="url" className="w-full">
                              <TabsList className="grid w-full grid-cols-2 h-9">
                                <TabsTrigger value="url" className="text-xs">URL</TabsTrigger>
                                <TabsTrigger value="file" className="text-xs">Local File</TabsTrigger>
                              </TabsList>
                              <TabsContent value="url" className="pt-2">
                                <div className="relative">
                                  <Video className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                  <Input 
                                    className="pl-10"
                                    placeholder="https://youtube.com/..."
                                    value={newModule.videoUrl}
                                    onChange={(e) => setNewModule(prev => ({ ...prev, videoUrl: e.target.value }))}
                                  />
                                </div>
                              </TabsContent>
                              <TabsContent value="file" className="pt-2">
                                <div className="space-y-2">
                                  <Input 
                                    type="file" 
                                    accept="video/*"
                                    onChange={(e) => handleFileUpload(e, 'videoUrl')}
                                  />
                                  <p className="text-[10px] text-zinc-500 italic">
                                    200MB Limit.
                                  </p>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        ) : (
                          <div className="md:col-span-2 space-y-2">
                            <Label className="font-bold">PDF Document</Label>
                            <div className="mt-1 flex items-center gap-4">
                              <Input 
                                type="file" 
                                accept=".pdf"
                                onChange={(e) => handleFileUpload(e, 'pdfUrl')}
                              />
                              <span className="text-xs text-zinc-400 font-medium">Max 2MB</span>
                            </div>
                          </div>
                        )}

                        <div className="md:col-span-2 space-y-2">
                          <Label className="font-bold">Thumbnail Image</Label>
                          <div className="mt-1 flex items-center gap-4">
                            <Input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'thumbnailUrl')}
                            />
                            {newModule.thumbnailUrl && (
                              <img src={newModule.thumbnailUrl} className="h-10 w-16 object-cover rounded border" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" className="font-bold min-w-[140px]" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Updating Module...
                            </>
                          ) : (
                            editingModuleId ? 'Update Module' : 'Save Module'
                          )}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => {
                          setIsAddingModule(false);
                          setEditingModuleId(null);
                        }}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-4">
            {loadingModules ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-zinc-100 rounded-xl">
                <p className="text-zinc-400 font-medium font-bold">No modules created yet.</p>
              </div>
            ) : (
              modules.map((mod, index) => (
                <Card 
                  key={mod.id} 
                  className="border-zinc-100 shadow-sm hover:border-zinc-200 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/admin/modules/${mod.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 font-black">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-zinc-900 group-hover:text-black transition-colors">{mod.title}</h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            mod.type === ModuleType.VIDEO ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {mod.type}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate max-w-md">{mod.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-600 hover:text-zinc-900" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditModule(mod);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-zinc-400 hover:text-red-600" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModule(mod.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-zinc-900">Student Directory</h3>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {loadingStudents ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-zinc-100 rounded-xl">
                <p className="text-zinc-400 font-medium font-bold">No students found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map(student => (
                  <Card key={student.id} className="border-zinc-100 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-zinc-100">
                          <AvatarImage src={student.photoUrl} />
                          <AvatarFallback className="bg-zinc-100 text-zinc-400">
                            <Users className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-zinc-900 leading-tight">{student.displayName || 'Anonymous Student'}</h4>
                          <p className="text-xs text-zinc-500 font-medium">{student.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Progress</div>
                        <div className="flex items-center gap-2 mt-1">
                          {student.completed ? (
                            <span className="flex items-center gap-1 text-green-600 font-bold text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              Certified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-zinc-600 font-bold text-xs">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              Lvl {student.unlockedModuleIndex + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
