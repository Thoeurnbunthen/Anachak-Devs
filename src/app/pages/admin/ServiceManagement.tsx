import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Plus, UserPlus, Edit, Trash2 } from "lucide-react";
import {
  getServices,
  getServiceStudents,
  createService,
  assignService,
  deleteService,
} from "../../service/get-allservice";
import type { Service, ServiceStudent } from "../../service/get-allservice";
import { getAllUsers } from "../../service/users";
import type { User } from "../../service/users";

export default function ServiceManagement() {
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [assignServiceOpen, setAssignServiceOpen] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceStudentsMap, setServiceStudentsMap] = useState<
    Record<number, ServiceStudent[]>
  >({});
  const [students, setStudents] = useState<User[]>([]);

  const [serviceForm, setServiceForm] = useState({ name: "", description: "" });
  const [serviceLoading, setServiceLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      const fetchedServices = await getServices();
      setServices(fetchedServices);

      const entries = await Promise.all(
        fetchedServices.map(async (service) => {
          try {
            const students = await getServiceStudents(service.serviceId);
            return [service.serviceId, students] as [number, ServiceStudent[]];
          } catch {
            return [service.serviceId, []] as [number, ServiceStudent[]];
          }
        }),
      );
      setServiceStudentsMap(Object.fromEntries(entries));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllData();
    getAllUsers()
      .then((users) =>
        setStudents(
          users.filter(
            (u) => u.role === "STUDENT" || u.role === "ROLE_STUDENT",
          ),
        ),
      )
      .catch(console.error);
  }, []);

  const handleCreateService = async () => {
    try {
      setServiceLoading(true);
      await createService(serviceForm);
      await fetchAllData();
      setCreateServiceOpen(false);
      setServiceForm({ name: "", description: "" });
      toast.success("Service created successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create service!");
    } finally {
      setServiceLoading(false);
    }
  };

  const handleAssignService = async () => {
    if (!selectedServiceId || !selectedStudentId) {
      toast.error("Please select both a service and a student!");
      return;
    }
    try {
      setAssignLoading(true);
      await assignService({
        serviceId: Number(selectedServiceId),
        studentId: Number(selectedStudentId),
      });
      await fetchAllData();
      setAssignServiceOpen(false);
      setSelectedServiceId("");
      setSelectedStudentId("");
      toast.success("Student assigned to service successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign service!");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    try {
      await deleteService(id);
      await fetchAllData();
      toast.success("Service deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete service!");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Service Management
          </h2>
          <p className="text-sm text-gray-500">
            Create and assign student services and duties
          </p>
        </div>

        {/* Action buttons — stack on mobile, row on sm+ */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Create Service Dialog */}
          <Dialog open={createServiceOpen} onOpenChange={setCreateServiceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Service
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Create New Service</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    placeholder="e.g., Library Duty"
                    value={serviceForm.name}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the responsibilities and duties"
                    rows={4}
                    value={serviceForm.description}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={handleCreateService}
                    disabled={serviceLoading}
                  >
                    {serviceLoading ? "Creating..." : "Create Service"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCreateServiceOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Assign Service Dialog */}
          <Dialog open={assignServiceOpen} onOpenChange={setAssignServiceOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to Student
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Assign Service to Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Service</Label>
                  <Select
                    value={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem
                          key={service.serviceId}
                          value={String(service.serviceId)}
                        >
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={handleAssignService}
                    disabled={assignLoading}
                  >
                    {assignLoading ? "Assigning..." : "Assign Service"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAssignServiceOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Service List ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:gap-4">
        {services.length === 0 ? (
          <Card className="p-6 text-center text-gray-400">
            No services found
          </Card>
        ) : (
          services.map((service) => {
            const assignedStudents =
              serviceStudentsMap[service.serviceId] ?? [];

            return (
              <Card key={service.serviceId} className="p-4 sm:p-6">
                {/* Service header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    {/* Name + badge — wrap on very narrow screens */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                        {service.name}
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {assignedStudents.length}{" "}
                        {assignedStudents.length === 1 ? "student" : "students"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {service.description}
                    </p>
                  </div>
                  {/* Action buttons — always compact icon-only */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDeleteService(service.serviceId)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Assigned students */}
                <div className="border-t pt-3 sm:pt-4">
                  {assignedStudents.length > 0 ? (
                    <>
                      <p className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                        Assigned Students:
                      </p>
                      {/* 1 col on mobile → 2 on sm → 3 on md → 4 on lg */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {assignedStudents.map((student) => (
                          <div
                            key={student.assignmentId}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                          >
                            {/* Avatar initials */}
                            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-medium">
                                {student.studentName
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {student.studentName}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {student.studentId}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No students assigned yet
                    </p>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Example Services ─────────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3">
          Example Services
        </h3>
        {/* 2 cols on mobile → 4 on md+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {[
            { name: "Library Duty", desc: "Organize books" },
            { name: "Cleaning Leader", desc: "Supervise cleaning" },
            { name: "Garden Work", desc: "Maintain garden" },
            { name: "Hall Monitor", desc: "Monitor corridors" },
          ].map((ex) => (
            <div key={ex.name} className="p-2.5 sm:p-3 bg-white rounded-lg">
              <p className="text-sm font-medium text-gray-900">{ex.name}</p>
              <p className="text-xs text-gray-600">{ex.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
