import { useState, useEffect, useMemo } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import {
  Edit,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import { BASE_URL } from "../../config/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomOption {
  id: number;
  roomNumber: string;
  side: string;
}

interface TaskResponse {
  taskId: number;
  title: string;
  description?: string;
  dayOfWeek: string;
  taskTime: string;
  roomNumber: string;
  side: string;
}

interface TaskCompletionResponse {
  completionId: number;
  taskId: number;
  taskTitle: string;
  completedDate: string;
  markedAt: string;
  markedByRole: string;
  markedByName: string;
  roomNumber: string;
}

interface TaskForm {
  title: string;
  description: string;
  roomNumber: string;
  dayOfWeek: string;
  taskTime: string;
}

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  roomNumber: "",
  dayOfWeek: "",
  taskTime: "",
};

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const JS_DAY_MAP: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

const TODAY_DAY = JS_DAY_MAP[new Date().getDay()];

function getCurrentWeekRange(): {
  from: string;
  to: string;
  dateByDay: Record<string, string>;
} {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const dateByDay: Record<string, string> = {};
  DAYS.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dateByDay[day] = d.toISOString().split("T")[0];
  });

  return {
    from: dateByDay["MONDAY"],
    to: dateByDay["SUNDAY"],
    dateByDay,
  };
}

const {
  from: WEEK_FROM,
  to: WEEK_TO,
  dateByDay: DATE_BY_DAY,
} = getCurrentWeekRange();

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTaskManagement() {
  const [allRooms, setAllRooms] = useState<RoomOption[]>([]);
  const [allTasks, setAllTasks] = useState<TaskResponse[]>([]);
  const [completions, setCompletions] = useState<TaskCompletionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Default to list on mobile (grid is hard to use on narrow screens)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterSide, setFilterSide] = useState("ALL");
  const [filterRoom, setFilterRoom] = useState("ALL");
  const [filterDay, setFilterDay] = useState("ALL");

  const [detailRoom, setDetailRoom] = useState<RoomOption | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  const token = localStorage.getItem("token");
  const authHeader = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchData() {
    try {
      setLoading(true);
      const roomsRes = await fetch(`${BASE_URL}/api/rooms`, {
        headers: authHeader,
      });
      if (!roomsRes.ok) throw new Error();
      const roomsData = await roomsRes.json();
      const rooms: RoomOption[] = roomsData.map((r: any) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        side: r.side,
      }));
      setAllRooms(rooms);

      const taskArrays = await Promise.all(
        rooms.map(async (room) => {
          const res = await fetch(
            `${BASE_URL}/api/tasks/room/${room.roomNumber}`,
            { headers: authHeader },
          );
          return res.ok ? ((await res.json()) as TaskResponse[]) : [];
        }),
      );
      setAllTasks(taskArrays.flat());

      const compRes = await fetch(
        `${BASE_URL}/api/tasks/completions?from=${WEEK_FROM}&to=${WEEK_TO}`,
        { headers: authHeader },
      );
      if (compRes.ok) setCompletions(await compRes.json());
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // ── Completion lookup ─────────────────────────────────────────────────────

  const completionSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of completions) s.add(`${c.taskId}|${c.completedDate}`);
    return s;
  }, [completions]);

  function isDoneOnDay(taskId: number, day: string): boolean {
    return completionSet.has(`${taskId}|${DATE_BY_DAY[day]}`);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.title || !form.roomNumber || !form.dayOfWeek || !form.taskTime) {
      toast.warning("Please fill in all required fields");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${BASE_URL}/api/tasks`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify(form),
      });
      if (res.status === 400) {
        toast.error((await res.text()) || "Duplicate task");
        return;
      }
      if (!res.ok) throw new Error();
      const created: TaskResponse = await res.json();
      setAllTasks((prev) => [...prev, created]);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success(`Task "${created.title}" created`);
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(task: TaskResponse) {
    setSelectedTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      roomNumber: task.roomNumber,
      dayOfWeek: task.dayOfWeek,
      taskTime: task.taskTime,
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!selectedTask || !form.title || !form.dayOfWeek || !form.taskTime) {
      toast.warning("Please fill in all required fields");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${BASE_URL}/api/tasks/${selectedTask.taskId}`, {
        method: "PUT",
        headers: authHeader,
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          dayOfWeek: form.dayOfWeek,
          taskTime: form.taskTime,
        }),
      });
      if (res.status === 400) {
        toast.error((await res.text()) || "Duplicate task");
        return;
      }
      if (!res.ok) throw new Error();
      const updated: TaskResponse = await res.json();
      setAllTasks((prev) =>
        prev.map((t) => (t.taskId === updated.taskId ? updated : t)),
      );
      setEditOpen(false);
      setSelectedTask(null);
      toast.success(`Task "${updated.title}" updated`);
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTask) return;
    try {
      setDeletingId(selectedTask.taskId);
      const res = await fetch(`${BASE_URL}/api/tasks/${selectedTask.taskId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error();
      setAllTasks((prev) =>
        prev.filter((t) => t.taskId !== selectedTask.taskId),
      );
      setCompletions((prev) =>
        prev.filter((c) => c.taskId !== selectedTask.taskId),
      );
      setDeleteOpen(false);
      setSelectedTask(null);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  }

  function openCreatePrefilled(roomNumber: string, day: string) {
    setForm({ ...EMPTY_FORM, roomNumber, dayOfWeek: day });
    setCreateOpen(true);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const visibleRooms = useMemo(
    () =>
      filterSide === "ALL"
        ? allRooms
        : allRooms.filter(
            (r) => r.side.toLowerCase() === filterSide.toLowerCase(),
          ),
    [allRooms, filterSide],
  );

  const taskMap = useMemo(() => {
    const map: Record<string, TaskResponse[]> = {};
    for (const t of allTasks) {
      const key = `${t.roomNumber}|${t.dayOfWeek.toUpperCase()}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [allTasks]);

  const filteredListTasks = useMemo(
    () =>
      allTasks.filter((task) => {
        const room = allRooms.find((r) => r.roomNumber === task.roomNumber);
        if (
          filterSide !== "ALL" &&
          room?.side.toLowerCase() !== filterSide.toLowerCase()
        )
          return false;
        if (filterRoom !== "ALL" && task.roomNumber !== filterRoom)
          return false;
        if (filterDay !== "ALL" && task.dayOfWeek.toUpperCase() !== filterDay)
          return false;
        return true;
      }),
    [allTasks, allRooms, filterSide, filterRoom, filterDay],
  );

  const totalTasks = allTasks.length;

  const doneThisWeek = useMemo(
    () =>
      allTasks.filter((t) => isDoneOnDay(t.taskId, t.dayOfWeek.toUpperCase()))
        .length,
    [allTasks, completionSet],
  );

  const emptyCells = useMemo(() => {
    let count = 0;
    for (const room of allRooms)
      for (const day of DAYS)
        if (!taskMap[`${room.roomNumber}|${day}`]?.length) count++;
    return count;
  }, [allRooms, taskMap]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">Loading tasks...</p>
      </div>
    );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Task Management
          </h2>
          <p className="text-sm text-gray-500">
            Weekly task coverage across all rooms
          </p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* ── Stats — 2×2 on mobile, 4 cols on sm+ ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 mb-1">Total tasks</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">
            {totalTasks}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 mb-1">Done this week</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">
            {doneThisWeek}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 mb-1">Pending</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">
            {totalTasks - doneThisWeek}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 mb-1">Empty slots</p>
          <p className="text-xl sm:text-2xl font-bold text-red-500">
            {emptyCells}
          </p>
        </Card>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterSide}
          onValueChange={(v) => {
            setFilterSide(v);
            setFilterRoom("ALL");
          }}
        >
          <SelectTrigger className="w-32 sm:w-36">
            <SelectValue placeholder="All sides" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sides</SelectItem>
            <SelectItem value="Girls">Girls</SelectItem>
            <SelectItem value="Boys">Boys</SelectItem>
          </SelectContent>
        </Select>

        {viewMode === "list" && (
          <>
            <Select value={filterRoom} onValueChange={setFilterRoom}>
              <SelectTrigger className="w-32 sm:w-36">
                <SelectValue placeholder="All rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All rooms</SelectItem>
                {visibleRooms.map((r) => (
                  <SelectItem key={r.id} value={r.roomNumber}>
                    Room {r.roomNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="w-32 sm:w-36">
                <SelectValue placeholder="All days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All days</SelectItem>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* View toggle — pushed to the right */}
        <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm transition-colors ${viewMode === "grid" ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm transition-colors border-l border-gray-200 ${viewMode === "list" ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* ── GRID VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div>
          {/* Horizontal scroll wrapper — lets the grid breathe on mobile */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <div className="min-w-[560px]">
              <Card className="overflow-hidden border-0 rounded-none shadow-none">
                {/* Header row */}
                <div
                  className="grid border-b border-gray-100 bg-gray-50"
                  style={{ gridTemplateColumns: "100px repeat(7, 1fr)" }}
                >
                  <div className="px-2 sm:px-3 py-2.5 text-xs font-medium text-gray-500">
                    Room
                  </div>
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className={`px-1 py-2.5 text-xs font-medium text-center border-l border-gray-100 ${day === TODAY_DAY ? "text-green-700" : "text-gray-500"}`}
                    >
                      {DAY_SHORT[day]}
                      {day === TODAY_DAY && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle" />
                      )}
                      <div className="text-[10px] text-gray-400 font-normal">
                        {DATE_BY_DAY[day]?.slice(5)}
                      </div>
                    </div>
                  ))}
                </div>

                {visibleRooms.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No rooms found
                  </div>
                ) : (
                  visibleRooms.map((room) => {
                    const rowTasks = DAYS.map(
                      (day) => taskMap[`${room.roomNumber}|${day}`] ?? [],
                    );
                    const coveredDays = rowTasks.filter(
                      (t) => t.length > 0,
                    ).length;
                    const flatRowTasks = rowTasks.flat();
                    const doneRoomTasks = flatRowTasks.filter((t) =>
                      isDoneOnDay(t.taskId, t.dayOfWeek.toUpperCase()),
                    ).length;

                    return (
                      <div
                        key={room.id}
                        className="grid border-b border-gray-100 last:border-0"
                        style={{ gridTemplateColumns: "100px repeat(7, 1fr)" }}
                      >
                        <div
                          className="px-2 sm:px-3 py-2 border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setDetailRoom(room);
                            setDetailOpen(true);
                          }}
                        >
                          <p className="text-xs sm:text-sm font-semibold text-gray-900">
                            {room.roomNumber}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-400">
                            {room.side}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1">
                            <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500 transition-all"
                                style={{
                                  width:
                                    flatRowTasks.length > 0
                                      ? `${Math.round((doneRoomTasks / flatRowTasks.length) * 100)}%`
                                      : "0%",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {coveredDays}/7
                            </span>
                          </div>
                        </div>

                        {DAYS.map((day) => {
                          const cells =
                            taskMap[`${room.roomNumber}|${day}`] ?? [];
                          const isEmpty = cells.length === 0;
                          return (
                            <div
                              key={day}
                              className={`border-l border-gray-100 p-1 min-h-[56px] flex flex-col gap-1 ${isEmpty ? "bg-orange-50/40" : ""} ${day === TODAY_DAY ? "bg-green-50/30" : ""}`}
                            >
                              {isEmpty ? (
                                <button
                                  onClick={() =>
                                    openCreatePrefilled(room.roomNumber, day)
                                  }
                                  className="w-full h-full min-h-[40px] flex items-center justify-center rounded border border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors group"
                                >
                                  <Plus className="w-3 h-3 text-gray-300 group-hover:text-green-500 transition-colors" />
                                </button>
                              ) : (
                                cells.map((task) => {
                                  const done = isDoneOnDay(task.taskId, day);
                                  return (
                                    <div
                                      key={task.taskId}
                                      onClick={() => openEdit(task)}
                                      className={`rounded px-1 py-0.5 text-[10px] sm:text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${done ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                                      title={`${task.title} — ${task.taskTime}`}
                                    >
                                      <span className="block truncate">
                                        {task.title}
                                      </span>
                                      <span className="opacity-70 hidden sm:block">
                                        {task.taskTime}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 px-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              Done this week
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
              Pending
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3 h-3 rounded bg-orange-50 border border-dashed border-gray-300" />
              No task
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
              Today
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <Card className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b bg-gray-50">
            <p className="text-sm font-medium text-gray-700">
              {filteredListTasks.length} task
              {filteredListTasks.length !== 1 ? "s" : ""}
              {filteredListTasks.length !== totalTasks &&
                ` (filtered from ${totalTasks})`}
            </p>
          </div>

          {/* Mobile card list (< md) */}
          <div className="md:hidden divide-y">
            {filteredListTasks.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">
                No tasks found
              </p>
            ) : (
              filteredListTasks.map((task) => {
                const room = allRooms.find(
                  (r) => r.roomNumber === task.roomNumber,
                );
                const done = isDoneOnDay(
                  task.taskId,
                  task.dayOfWeek.toUpperCase(),
                );
                return (
                  <div key={task.taskId} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(task)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedTask(task);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-500 font-medium">
                        Room {task.roomNumber}
                      </span>
                      <Badge
                        variant={
                          room?.side.toLowerCase() === "girls"
                            ? "secondary"
                            : "default"
                        }
                        className="text-xs px-1.5 py-0"
                      >
                        {room?.side ?? task.side}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 ${task.dayOfWeek.toUpperCase() === TODAY_DAY ? "border-green-400 text-green-700" : ""}`}
                      >
                        {task.dayOfWeek.charAt(0) +
                          task.dayOfWeek.slice(1).toLowerCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {task.taskTime}
                      </span>
                      {done ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Time</TableHead>
                  <TableHead className="w-32">This week</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-400 py-12"
                    >
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredListTasks.map((task) => {
                    const room = allRooms.find(
                      (r) => r.roomNumber === task.roomNumber,
                    );
                    const done = isDoneOnDay(
                      task.taskId,
                      task.dayOfWeek.toUpperCase(),
                    );
                    return (
                      <TableRow key={task.taskId}>
                        <TableCell className="font-medium">
                          {task.roomNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              room?.side.toLowerCase() === "girls"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {room?.side ?? task.side}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              task.dayOfWeek.toUpperCase() === TODAY_DAY
                                ? "border-green-400 text-green-700"
                                : ""
                            }
                          >
                            {task.dayOfWeek.charAt(0) +
                              task.dayOfWeek.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {task.title}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {task.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {task.taskTime}
                        </TableCell>
                        <TableCell>
                          {done ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(task)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(task);
                                setDeleteOpen(true);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── Room Detail Modal ─────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Room {detailRoom?.roomNumber} — {detailRoom?.side}
            </DialogTitle>
          </DialogHeader>
          {detailRoom && (
            <div className="space-y-3 py-1">
              {DAYS.map((day) => {
                const dayTasks =
                  taskMap[`${detailRoom.roomNumber}|${day}`] ?? [];
                const isEmpty = dayTasks.length === 0;
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${day === TODAY_DAY ? "text-green-700" : "text-gray-700"}`}
                        >
                          {DAY_SHORT[day]}
                          {day === TODAY_DAY && (
                            <span className="ml-1 text-green-500">●</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {DATE_BY_DAY[day]}
                        </span>
                        {isEmpty && (
                          <span className="flex items-center gap-1 text-xs text-orange-500">
                            <AlertTriangle className="w-3 h-3" /> No task
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setDetailOpen(false);
                          openCreatePrefilled(detailRoom.roomNumber, day);
                        }}
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-0.5 flex-shrink-0"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {isEmpty ? (
                      <div className="h-8 rounded border border-dashed border-gray-200 bg-orange-50/40" />
                    ) : (
                      <div className="space-y-1">
                        {dayTasks.map((task) => {
                          const done = isDoneOnDay(task.taskId, day);
                          return (
                            <div
                              key={task.taskId}
                              className="flex items-center justify-between rounded px-3 py-1.5 bg-gray-50 border border-gray-100"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                )}
                                <span className="text-sm text-gray-800 truncate">
                                  {task.title}
                                </span>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {task.taskTime}
                                </span>
                                {done && (
                                  <span className="text-xs text-green-600 font-medium flex-shrink-0 hidden sm:inline">
                                    ✓ this week
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setDetailOpen(false);
                                    openEdit(task);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-700 rounded"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDetailOpen(false);
                                    setSelectedTask(task);
                                    setDeleteOpen(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Room <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.roomNumber}
                onValueChange={(v) => setForm({ ...form, roomNumber: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {allRooms.map((room) => (
                    <SelectItem key={room.id} value={room.roomNumber}>
                      Room {room.roomNumber} — {room.side}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Day <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.dayOfWeek}
                onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                      {day === TODAY_DAY && " (today)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Time <span className="text-red-500">*</span>
              </Label>
              <Input
                type="time"
                value={form.taskTime}
                onChange={(e) => setForm({ ...form, taskTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Clean bathroom"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional details..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Task"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Room</Label>
              <Input value={`Room ${selectedTask?.roomNumber}`} disabled />
            </div>
            <div className="space-y-2">
              <Label>
                Day <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.dayOfWeek}
                onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                      {day === TODAY_DAY && " (today)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Time <span className="text-red-500">*</span>
              </Label>
              <Input
                type="time"
                value={form.taskTime}
                onChange={(e) => setForm({ ...form, taskTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleEdit}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[95vw] max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                "{selectedTask?.title}"
              </span>{" "}
              from Room {selectedTask?.roomNumber}? This will also delete all
              completion history.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                disabled={deletingId !== null}
              >
                {deletingId !== null ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteOpen(false)}
                disabled={deletingId !== null}
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
