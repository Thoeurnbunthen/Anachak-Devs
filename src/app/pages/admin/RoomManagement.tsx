import { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { toast } from "react-toastify";
import {
  Users,
  Home,
  UserCheck,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  UserMinus,
} from "lucide-react";
import { BASE_URL } from "../../config/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomOption {
  id: number;
  roomNumber: string;
  side: string;
  totalStudents: number;
  teachers: { teacherId: number; name: string }[];
  students: { studentId: number; name: string; idCardNumber: string }[];
}

interface TeacherOption {
  id: number;
  name: string;
  email: string;
  idCardNumber: string;
  rooms: { roomId: number; roomNumber: string; side: string }[];
}

interface StudentOption {
  id: number;
  name: string;
  email: string;
  idCardNumber: string;
  room: { roomId: number; roomNumber: string; side: string } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoomManagement() {
  const [allRooms, setAllRooms] = useState<RoomOption[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedRoomForTeacher, setSelectedRoomForTeacher] =
    useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [assigningTeacher, setAssigningTeacher] = useState<boolean>(false);
  const [removeTeacherOpen, setRemoveTeacherOpen] = useState<boolean>(false);
  const [removeTarget, setRemoveTarget] = useState<{
    teacherId: number;
    teacherName: string;
    roomNumber: string;
  } | null>(null);

  const [selectedRoomForStudent, setSelectedRoomForStudent] =
    useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assigningStudents, setAssigningStudents] = useState<boolean>(false);
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [filterSide, setFilterSide] = useState<string>("ALL");

  const [selectedRoomDetail, setSelectedRoomDetail] =
    useState<RoomOption | null>(null);
  const [roomDetailSearch, setRoomDetailSearch] = useState<string>("");

  const [removeStudentOpen, setRemoveStudentOpen] = useState<boolean>(false);
  const [removeStudentTarget, setRemoveStudentTarget] = useState<{
    studentId: number;
    studentName: string;
    roomNumber: string;
  } | null>(null);

  const [createRoomOpen, setCreateRoomOpen] = useState<boolean>(false);
  const [roomForm, setRoomForm] = useState({ roomNumber: "", side: "" });
  const [creatingRoom, setCreatingRoom] = useState<boolean>(false);

  const token = localStorage.getItem("token");
  const authHeader = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const [roomsRes, teachersRes, studentsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/rooms`, { headers: authHeader }),
        fetch(`${BASE_URL}/api/users/teachers?page=0&size=1000`, {
          headers: authHeader,
        }),
        fetch(`${BASE_URL}/api/users/students?page=0&size=1000`, {
          headers: authHeader,
        }),
      ]);

      if (roomsRes.ok) {
        const data = await roomsRes.json();
        const mapped: RoomOption[] = data.map((r: any) => ({
          id: r.id,
          roomNumber: r.roomNumber,
          side: r.side,
          totalStudents: r.students?.length ?? 0,
          teachers: r.teachers ?? [],
          students: r.students ?? [],
        }));
        setAllRooms(mapped);
        setSelectedRoomDetail((prev) =>
          prev ? (mapped.find((r) => r.id === prev.id) ?? null) : null,
        );
      }
      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setAllTeachers(data.content ?? []);
      }
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setAllStudents(data.content ?? []);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const availableRoomsForTeacher = allRooms.filter(
    (r) => r.teachers.length === 0,
  );
  const unassignedStudents = allStudents.filter((s) => s.room === null);
  const filteredStudents = unassignedStudents.filter(
    (s) =>
      studentSearch === "" ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.idCardNumber.toLowerCase().includes(studentSearch.toLowerCase()),
  );
  const filteredRooms =
    filterSide === "ALL"
      ? allRooms
      : allRooms.filter(
          (r) => r.side.toLowerCase() === filterSide.toLowerCase(),
        );

  const filteredRoomDetailStudents = (
    selectedRoomDetail?.students ?? []
  ).filter(
    (s) =>
      roomDetailSearch === "" ||
      s.name.toLowerCase().includes(roomDetailSearch.toLowerCase()) ||
      s.idCardNumber.toLowerCase().includes(roomDetailSearch.toLowerCase()),
  );

  async function handleCreateRoom() {
    if (!roomForm.roomNumber || !roomForm.side) {
      toast.warning("Please fill in all fields");
      return;
    }
    try {
      setCreatingRoom(true);
      const res = await fetch(`${BASE_URL}/api/rooms`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify(roomForm),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create room");
      }
      toast.success(`Room ${roomForm.roomNumber} created successfully`);
      setCreateRoomOpen(false);
      setRoomForm({ roomNumber: "", side: "" });
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleAssignTeacher() {
    if (!selectedRoomForTeacher || !selectedTeacherId) {
      toast.warning("Please select both a room and a teacher");
      return;
    }
    const chosenRoom = allRooms.find(
      (r) => r.roomNumber === selectedRoomForTeacher,
    );
    if (chosenRoom && chosenRoom.teachers.length > 0) {
      toast.error(
        `Room ${selectedRoomForTeacher} already has a teacher assigned.`,
      );
      return;
    }
    try {
      setAssigningTeacher(true);
      const res = await fetch(`${BASE_URL}/api/teacher-room/assign`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          teacherId: Number(selectedTeacherId),
          roomNumber: selectedRoomForTeacher,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to assign teacher");
      }
      toast.success("Teacher assigned successfully");
      setSelectedRoomForTeacher("");
      setSelectedTeacherId("");
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign teacher");
    } finally {
      setAssigningTeacher(false);
    }
  }

  async function handleRemoveTeacher() {
    if (!removeTarget) return;
    try {
      const res = await fetch(
        `${BASE_URL}/api/teacher-room/remove?teacherId=${removeTarget.teacherId}&roomNumber=${removeTarget.roomNumber}`,
        { method: "DELETE", headers: authHeader },
      );
      if (!res.ok) throw new Error("Failed to remove teacher");
      toast.success("Teacher removed from room");
      setRemoveTeacherOpen(false);
      setRemoveTarget(null);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove teacher");
    }
  }

  async function handleAssignStudents() {
    if (!selectedRoomForStudent || selectedStudentIds.length === 0) {
      toast.warning("Please select a room and at least one student");
      return;
    }
    try {
      setAssigningStudents(true);
      const res = await fetch(`${BASE_URL}/api/rooms/assign-students`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          roomNumber: selectedRoomForStudent,
          studentIds: selectedStudentIds,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to assign students");
      }
      toast.success(
        `${selectedStudentIds.length} student(s) assigned to room ${selectedRoomForStudent}`,
      );
      setSelectedStudentIds([]);
      setSelectedRoomForStudent("");
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign students");
    } finally {
      setAssigningStudents(false);
    }
  }

  async function handleRemoveStudent() {
    if (!removeStudentTarget) return;
    try {
      const res = await fetch(`${BASE_URL}/api/rooms/remove-students`, {
        method: "DELETE",
        headers: authHeader,
        body: JSON.stringify({
          roomNumber: removeStudentTarget.roomNumber,
          studentIds: [removeStudentTarget.studentId],
        }),
      });
      if (!res.ok) throw new Error("Failed to remove student");
      toast.success(
        `${removeStudentTarget.studentName} removed from room ${removeStudentTarget.roomNumber}`,
      );
      setRemoveStudentOpen(false);
      setRemoveStudentTarget(null);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove student");
    }
  }

  function toggleStudent(studentId: number) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Room Management
          </h2>
          <p className="text-sm text-gray-500">
            Manage rooms, assign teachers and students
          </p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          onClick={() => setCreateRoomOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Create Room
        </Button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      {/* 3 cols always — cards are compact enough; shrink text on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Home className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 leading-tight">Total Rooms</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {allRooms.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 leading-tight">Unassigned</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {unassignedStudents.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-500 leading-tight">Teachers</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {allTeachers.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="rooms">
        {/* Scrollable tab bar on narrow screens */}
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-max min-w-full sm:w-auto">
            <TabsTrigger
              value="rooms"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              Rooms ({allRooms.length})
            </TabsTrigger>
            <TabsTrigger
              value="assign-teacher"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              Assign Teacher
            </TabsTrigger>
            <TabsTrigger
              value="assign-students"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              Assign Students
              {unassignedStudents.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                  {unassignedStudents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab 1: Rooms Overview ──────────────────────────────────────────── */}
        <TabsContent value="rooms" className="space-y-4">
          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Filter:</span>
            {(["ALL", "Girls", "Boys"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setFilterSide(side)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  filterSide === side
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {side === "ALL" ? `All (${allRooms.length})` : side}
              </button>
            ))}
          </div>

          {/* ── Mobile card list (< md) ── */}
          <div className="md:hidden space-y-3">
            {filteredRooms.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                No rooms found
              </p>
            ) : (
              filteredRooms.map((room) => (
                <Card key={room.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">
                        {room.roomNumber}
                      </span>
                      <Badge
                        variant={
                          room.side.toLowerCase() === "girls"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {room.side}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={async () => {
                        if (
                          !confirm(
                            `Delete room ${room.roomNumber}? This cannot be undone.`,
                          )
                        )
                          return;
                        try {
                          const res = await fetch(
                            `${BASE_URL}/api/rooms/id/${room.id}`,
                            {
                              method: "DELETE",
                              headers: authHeader,
                            },
                          );
                          if (!res.ok) throw new Error();
                          toast.success(`Room ${room.roomNumber} deleted`);
                          await fetchAll();
                        } catch {
                          toast.error("Failed to delete room");
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Teacher */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Teacher</p>
                    {room.teachers.length === 0 ? (
                      <span className="text-xs text-gray-400">
                        No teacher assigned
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {room.teachers.map((t) => (
                          <div
                            key={t.teacherId}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full"
                          >
                            <span className="text-xs text-purple-700">
                              {t.name}
                            </span>
                            <button
                              onClick={() => {
                                setRemoveTarget({
                                  teacherId: t.teacherId,
                                  teacherName: t.name,
                                  roomNumber: room.roomNumber,
                                });
                                setRemoveTeacherOpen(true);
                              }}
                              className="text-purple-400 hover:text-red-500 ml-0.5"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Students */}
                  <button
                    onClick={() => {
                      setSelectedRoomDetail(room);
                      setRoomDetailSearch("");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      {room.totalStudents}{" "}
                      {room.totalStudents === 1 ? "student" : "students"}
                    </span>
                  </button>
                </Card>
              ))
            )}
          </div>

          {/* ── Desktop table (md+) ── */}
          <Card className="overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Assigned Teacher</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-400 py-8"
                      >
                        No rooms found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-bold text-gray-900">
                          {room.roomNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              room.side.toLowerCase() === "girls"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {room.side}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {room.teachers.length === 0 ? (
                            <span className="text-xs text-gray-400">
                              No teacher assigned
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {room.teachers.map((t) => (
                                <div
                                  key={t.teacherId}
                                  className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full"
                                >
                                  <span className="text-xs text-purple-700">
                                    {t.name}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setRemoveTarget({
                                        teacherId: t.teacherId,
                                        teacherName: t.name,
                                        roomNumber: room.roomNumber,
                                      });
                                      setRemoveTeacherOpen(true);
                                    }}
                                    className="text-purple-400 hover:text-red-500 ml-0.5"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => {
                              setSelectedRoomDetail(room);
                              setRoomDetailSearch("");
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors group"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                              {room.totalStudents}{" "}
                              {room.totalStudents === 1
                                ? "student"
                                : "students"}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Delete room ${room.roomNumber}? This cannot be undone.`,
                                )
                              )
                                return;
                              try {
                                const res = await fetch(
                                  `${BASE_URL}/api/rooms/id/${room.id}`,
                                  {
                                    method: "DELETE",
                                    headers: authHeader,
                                  },
                                );
                                if (!res.ok) throw new Error();
                                toast.success(
                                  `Room ${room.roomNumber} deleted`,
                                );
                                await fetchAll();
                              } catch {
                                toast.error("Failed to delete room");
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Assign Teacher ──────────────────────────────────────────── */}
        <TabsContent value="assign-teacher" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-1">
              Assign Teacher to Room
            </h3>
            <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Each room can only have{" "}
                <span className="font-semibold">one teacher</span> assigned.
                Rooms that already have a teacher are not shown below. To
                reassign, remove the current teacher first.
              </p>
            </div>

            {availableRoomsForTeacher.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 gap-2">
                <UserCheck className="w-8 h-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  All rooms have a teacher assigned
                </p>
                <p className="text-xs">
                  Remove a teacher from a room to reassign.
                </p>
              </div>
            ) : (
              <>
                {/* Stacked on mobile, side-by-side on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Select Room{" "}
                      <span className="text-xs text-gray-400 font-normal">
                        ({availableRoomsForTeacher.length} available)
                      </span>
                    </Label>
                    <Select
                      value={selectedRoomForTeacher}
                      onValueChange={setSelectedRoomForTeacher}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a room without a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoomsForTeacher.map((room) => (
                          <SelectItem key={room.id} value={room.roomNumber}>
                            Room {room.roomNumber} — {room.side}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Teacher</Label>
                    <Select
                      value={selectedTeacherId}
                      onValueChange={setSelectedTeacherId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTeachers.map((teacher) => (
                          <SelectItem
                            key={teacher.id}
                            value={String(teacher.id)}
                          >
                            {teacher.name}
                            {teacher.rooms?.length > 0 &&
                              ` (${teacher.rooms.length} room${teacher.rooms.length > 1 ? "s" : ""})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="mt-4 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  onClick={handleAssignTeacher}
                  disabled={
                    assigningTeacher ||
                    !selectedRoomForTeacher ||
                    !selectedTeacherId
                  }
                >
                  {assigningTeacher ? "Assigning..." : "Assign Teacher"}
                </Button>
              </>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                Current Teacher Assignments
              </h3>
              <span className="text-xs text-gray-400">
                {allRooms.filter((r) => r.teachers.length > 0).length} of{" "}
                {allRooms.length} rooms assigned
              </span>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {allRooms.map((room) => (
                <div key={room.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">
                      {room.roomNumber}
                    </span>
                    <Badge
                      variant={
                        room.side.toLowerCase() === "girls"
                          ? "secondary"
                          : "default"
                      }
                      className="text-xs"
                    >
                      {room.side}
                    </Badge>
                  </div>
                  {room.teachers.length === 0 ? (
                    <span className="text-xs text-gray-400">
                      No teacher assigned
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {room.teachers.map((t) => (
                        <div
                          key={t.teacherId}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full"
                        >
                          <span className="text-xs text-purple-700">
                            {t.name}
                          </span>
                          <button
                            onClick={() => {
                              setRemoveTarget({
                                teacherId: t.teacherId,
                                teacherName: t.name,
                                roomNumber: room.roomNumber,
                              });
                              setRemoveTeacherOpen(true);
                            }}
                            className="text-purple-400 hover:text-red-500 ml-0.5"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Assigned Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">
                        {room.roomNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            room.side.toLowerCase() === "girls"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {room.side}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {room.teachers.length === 0 ? (
                          <span className="text-xs text-gray-400">
                            No teacher assigned
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {room.teachers.map((t) => (
                              <div
                                key={t.teacherId}
                                className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full"
                              >
                                <span className="text-xs text-purple-700">
                                  {t.name}
                                </span>
                                <button
                                  onClick={() => {
                                    setRemoveTarget({
                                      teacherId: t.teacherId,
                                      teacherName: t.name,
                                      roomNumber: room.roomNumber,
                                    });
                                    setRemoveTeacherOpen(true);
                                  }}
                                  className="text-purple-400 hover:text-red-500 ml-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Assign Students ─────────────────────────────────────────── */}
        <TabsContent value="assign-students" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Assign Students to Room
            </h3>

            <div className="space-y-2 mb-4">
              <Label>Select Room</Label>
              <Select
                value={selectedRoomForStudent}
                onValueChange={(v) => {
                  setSelectedRoomForStudent(v);
                  setSelectedStudentIds([]);
                }}
              >
                <SelectTrigger className="w-full sm:max-w-sm">
                  <SelectValue placeholder="Choose a room to assign students" />
                </SelectTrigger>
                <SelectContent>
                  {allRooms.map((room) => (
                    <SelectItem key={room.id} value={room.roomNumber}>
                      Room {room.roomNumber} — {room.side} ({room.totalStudents}{" "}
                      students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative mb-4 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search unassigned students..."
                className="pl-9"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>

            {unassignedStudents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">
                All students are assigned to rooms
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-500">
                    {filteredStudents.length} unassigned student
                    {filteredStudents.length !== 1 ? "s" : ""}
                    {selectedStudentIds.length > 0 && (
                      <span className="ml-2 text-green-600 font-medium">
                        • {selectedStudentIds.length} selected
                      </span>
                    )}
                  </p>
                  {selectedStudentIds.length > 0 && (
                    <button
                      onClick={() => setSelectedStudentIds([])}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden max-h-64 sm:max-h-72 overflow-y-auto">
                  {filteredStudents.map((student, index) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } ${isSelected ? "bg-green-50 border-l-4 border-green-500" : "hover:bg-gray-100"}`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {student.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.idCardNumber}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  className="mt-4 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  onClick={handleAssignStudents}
                  disabled={
                    assigningStudents ||
                    !selectedRoomForStudent ||
                    selectedStudentIds.length === 0
                  }
                >
                  {assigningStudents
                    ? "Assigning..."
                    : `Assign ${selectedStudentIds.length > 0 ? selectedStudentIds.length : ""} Student${selectedStudentIds.length !== 1 ? "s" : ""} to Room ${selectedRoomForStudent || "..."}`}
                </Button>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Room Detail Modal ──────────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedRoomDetail}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRoomDetail(null);
            setRoomDetailSearch("");
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Home className="w-5 h-5 text-gray-500 flex-shrink-0" />
              Room {selectedRoomDetail?.roomNumber}
              <Badge
                variant={
                  selectedRoomDetail?.side.toLowerCase() === "girls"
                    ? "secondary"
                    : "default"
                }
                className="ml-1"
              >
                {selectedRoomDetail?.side}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedRoomDetail && (
            <div className="px-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                Teacher
              </p>
              {selectedRoomDetail.teachers.length === 0 ? (
                <p className="text-sm text-gray-400 italic mb-4">
                  No teacher assigned
                </p>
              ) : (
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedRoomDetail.teachers.map((t) => (
                    <span
                      key={t.teacherId}
                      className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                  Students ({selectedRoomDetail.students.length})
                </p>
              </div>

              {selectedRoomDetail.students.length > 5 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Search students..."
                    className="pl-8 h-8 text-sm"
                    value={roomDetailSearch}
                    onChange={(e) => setRoomDetailSearch(e.target.value)}
                  />
                </div>
              )}

              {selectedRoomDetail.students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Users className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm">No students in this room</p>
                </div>
              ) : filteredRoomDetailStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No students match your search
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 sm:max-h-80 overflow-y-auto pr-1">
                  {filteredRoomDetailStudents.map((s) => (
                    <div
                      key={s.studentId}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {s.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.idCardNumber}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                        onClick={() => {
                          setRemoveStudentTarget({
                            studentId: s.studentId,
                            studentName: s.name,
                            roomNumber: selectedRoomDetail.roomNumber,
                          });
                          setRemoveStudentOpen(true);
                        }}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Remove Teacher Modal ─────────────────────────────────────────────── */}
      <Dialog open={removeTeacherOpen} onOpenChange={setRemoveTeacherOpen}>
        <DialogContent className="w-[95vw] max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Remove Teacher</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Remove{" "}
              <span className="font-semibold text-gray-900">
                {removeTarget?.teacherName}
              </span>{" "}
              from Room{" "}
              <span className="font-semibold text-gray-900">
                {removeTarget?.roomNumber}
              </span>
              ?
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleRemoveTeacher}
              >
                Remove
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRemoveTeacherOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Remove Student Modal ─────────────────────────────────────────────── */}
      <Dialog
        open={removeStudentOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveStudentOpen(false);
            setRemoveStudentTarget(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-500" /> Remove Student
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Remove{" "}
              <span className="font-semibold text-gray-900">
                {removeStudentTarget?.studentName}
              </span>{" "}
              from Room{" "}
              <span className="font-semibold text-gray-900">
                {removeStudentTarget?.roomNumber}
              </span>
              ?
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleRemoveStudent}
              >
                Remove
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRemoveStudentOpen(false);
                  setRemoveStudentTarget(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Room Modal ────────────────────────────────────────────────── */}
      <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
        <DialogContent className="w-[95vw] max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Create Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Room Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. A101"
                value={roomForm.roomNumber}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, roomNumber: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Side <span className="text-red-500">*</span>
              </Label>
              <Select
                value={roomForm.side}
                onValueChange={(v) => setRoomForm({ ...roomForm, side: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Girls">Girls</SelectItem>
                  <SelectItem value="Boys">Boys</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleCreateRoom}
                disabled={creatingRoom}
              >
                {creatingRoom ? "Creating..." : "Create Room"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreateRoomOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
