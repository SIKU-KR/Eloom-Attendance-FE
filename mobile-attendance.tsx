"use client"

import { useState } from "react"
import {
  Calendar,
  Church,
  Users,
  Search,
  Filter,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface AttendanceStatus {
  worship: boolean
  mokjang: boolean
}

interface Student {
  id: number
  name: string
  attendance: Record<string, AttendanceStatus>
  mokjang: string
  leader: string
  phone?: string
}

interface MokjangGroup {
  name: string
  leader: string
  students: Student[]
  isOpen: boolean
}

export default function Component() {
  const [students, setStudents] = useState<Student[]>([
    {
      id: 1,
      name: "김민수",
      attendance: {
        "2023-06-11": { worship: true, mokjang: false },
        "2023-06-04": { worship: true, mokjang: true },
      },
      mokjang: "베드로목장",
      leader: "이목사",
      phone: "010-1234-5678",
    },
    {
      id: 2,
      name: "이지은",
      attendance: {
        "2023-06-11": { worship: false, mokjang: true },
        "2023-06-04": { worship: true, mokjang: false },
      },
      mokjang: "베드로목장",
      leader: "이목사",
      phone: "010-2345-6789",
    },
    {
      id: 3,
      name: "박준호",
      attendance: {
        "2023-06-11": { worship: false, mokjang: false },
        "2023-06-04": { worship: false, mokjang: true },
      },
      mokjang: "베드로목장",
      leader: "이목사",
      phone: "010-3456-7890",
    },
    {
      id: 4,
      name: "최서연",
      attendance: {
        "2023-06-11": { worship: true, mokjang: false },
        "2023-06-04": { worship: true, mokjang: true },
      },
      mokjang: "바울목장",
      leader: "김전도사",
      phone: "010-4567-8901",
    },
    {
      id: 5,
      name: "정우진",
      attendance: {
        "2023-06-11": { worship: false, mokjang: true },
        "2023-06-04": { worship: false, mokjang: false },
      },
      mokjang: "바울목장",
      leader: "김전도사",
      phone: "010-5678-9012",
    },
    {
      id: 6,
      name: "한소영",
      attendance: {
        "2023-06-11": { worship: true, mokjang: false },
        "2023-06-04": { worship: true, mokjang: true },
      },
      mokjang: "바울목장",
      leader: "김전도사",
      phone: "010-6789-0123",
    },
    {
      id: 7,
      name: "임태현",
      attendance: {
        "2023-06-11": { worship: false, mokjang: true },
        "2023-06-04": { worship: true, mokjang: false },
      },
      mokjang: "다윗목장",
      leader: "박집사",
      phone: "010-7890-1234",
    },
    {
      id: 8,
      name: "송미래",
      attendance: {
        "2023-06-11": { worship: true, mokjang: false },
        "2023-06-04": { worship: false, mokjang: true },
      },
      mokjang: "다윗목장",
      leader: "박집사",
      phone: "010-8901-2345",
    },
    {
      id: 9,
      name: "강동원",
      attendance: {
        "2023-06-11": { worship: false, mokjang: false },
        "2023-06-04": { worship: false, mokjang: false },
      },
      mokjang: "다윗목장",
      leader: "박집사",
      phone: "010-9012-3456",
    },
    {
      id: 10,
      name: "윤서진",
      attendance: {
        "2023-06-11": { worship: false, mokjang: true },
        "2023-06-04": { worship: true, mokjang: true },
      },
      mokjang: "다윗목장",
      leader: "박집사",
      phone: "010-0123-4567",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "mokjang">("mokjang")
  const [filterMokjang, setFilterMokjang] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [mokjangStates, setMokjangStates] = useState<Record<string, boolean>>({})

  // 관리 페이지 상태
  const [isManageSheetOpen, setIsManageSheetOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [newStudent, setNewStudent] = useState({
    name: "",
    mokjang: "",
    leader: "",
    phone: "",
  })

  const formattedDate = format(selectedDate, "yyyy-MM-dd")
  const displayDate = format(selectedDate, "PPP", { locale: ko })

  const updateAttendance = (id: number, type: "worship" | "mokjang", value: boolean) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== id) return student

        const currentAttendance = student.attendance[formattedDate] || { worship: false, mokjang: false }
        return {
          ...student,
          attendance: {
            ...student.attendance,
            [formattedDate]: {
              ...currentAttendance,
              [type]: value,
            },
          },
        }
      }),
    )
  }

  const toggleMokjang = (mokjangName: string) => {
    setMokjangStates((prev) => ({
      ...prev,
      [mokjangName]: !prev[mokjangName],
    }))
  }

  const addStudent = () => {
    if (newStudent.name && newStudent.mokjang && newStudent.leader) {
      const id = Math.max(...students.map((s) => s.id)) + 1
      setStudents((prev) => [
        ...prev,
        {
          id,
          name: newStudent.name,
          attendance: {},
          mokjang: newStudent.mokjang,
          leader: newStudent.leader,
          phone: newStudent.phone,
        },
      ])
      setNewStudent({ name: "", mokjang: "", leader: "", phone: "" })
      setIsAddDialogOpen(false)
    }
  }

  const updateStudent = () => {
    if (editingStudent) {
      setStudents((prev) => prev.map((student) => (student.id === editingStudent.id ? editingStudent : student)))
      setEditingStudent(null)
    }
  }

  const deleteStudent = (id: number) => {
    setStudents((prev) => prev.filter((student) => student.id !== id))
  }

  const changeDate = (increment: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + increment)
    setSelectedDate(newDate)
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMokjang = filterMokjang === "all" || student.mokjang === filterMokjang
    return matchesSearch && matchesMokjang
  })

  const groupedByMokjang = filteredStudents.reduce(
    (groups, student) => {
      const mokjang = student.mokjang
      if (!groups[mokjang]) {
        groups[mokjang] = {
          name: mokjang,
          leader: student.leader,
          students: [],
          isOpen: mokjangStates[mokjang] !== false,
        }
      }
      groups[mokjang].students.push(student)
      return groups
    },
    {} as Record<string, MokjangGroup>,
  )

  const sortedStudents =
    sortBy === "mokjang"
      ? Object.values(groupedByMokjang)
      : filteredStudents.sort((a, b) => a.name.localeCompare(b.name, "ko"))

  const mokjangList = Array.from(new Set(students.map((s) => s.mokjang)))

  const getAttendanceStats = () => {
    let worshipCount = 0
    let mokjangCount = 0
    let bothCount = 0
    let absentCount = 0

    students.forEach((student) => {
      const attendance = student.attendance[formattedDate] || { worship: false, mokjang: false }
      if (attendance.worship && attendance.mokjang) bothCount++
      else if (attendance.worship) worshipCount++
      else if (attendance.mokjang) mokjangCount++
      else absentCount++
    })

    return { worshipCount, mokjangCount, bothCount, absentCount }
  }

  const stats = getAttendanceStats()

  const getMokjangStats = (mokjangName: string) => {
    const mokjangStudents = students.filter((s) => s.mokjang === mokjangName)
    let worship = 0
    let mokjang = 0
    let both = 0
    const total = mokjangStudents.length

    mokjangStudents.forEach((student) => {
      const attendance = student.attendance[formattedDate] || { worship: false, mokjang: false }
      if (attendance.worship && attendance.mokjang) both++
      else if (attendance.worship) worship++
      else if (attendance.mokjang) mokjang++
    })

    const attended = worship + mokjang + both
    return { worship, mokjang, both, total, attended, rate: total > 0 ? Math.round((attended / total) * 100) : 0 }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">목장 출석부</h1>
            <div className="flex items-center gap-2">
              <Sheet open={isManageSheetOpen} onOpenChange={setIsManageSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    <span className="text-sm">인원 관리</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <UserCog className="h-5 w-5" />
                      구성원 관리
                    </SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          구성원 추가
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>새 구성원 추가</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">이름</Label>
                            <Input
                              id="name"
                              value={newStudent.name}
                              onChange={(e) => setNewStudent((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="이름을 입력하세요"
                            />
                          </div>
                          <div>
                            <Label htmlFor="mokjang">목장</Label>
                            <Input
                              id="mokjang"
                              value={newStudent.mokjang}
                              onChange={(e) => setNewStudent((prev) => ({ ...prev, mokjang: e.target.value }))}
                              placeholder="목장명을 입력하세요"
                            />
                          </div>
                          <div>
                            <Label htmlFor="leader">리더</Label>
                            <Input
                              id="leader"
                              value={newStudent.leader}
                              onChange={(e) => setNewStudent((prev) => ({ ...prev, leader: e.target.value }))}
                              placeholder="리더명을 입력하세요"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">연락처</Label>
                            <Input
                              id="phone"
                              value={newStudent.phone}
                              onChange={(e) => setNewStudent((prev) => ({ ...prev, phone: e.target.value }))}
                              placeholder="연락처를 입력하세요"
                            />
                          </div>
                          <Button onClick={addStudent} className="w-full">
                            추가하기
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                      {students.map((student) => (
                        <Card key={student.id} className="shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">{student.name.charAt(0)}</span>
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">{student.name}</h3>
                                  <p className="text-sm text-gray-600">
                                    {student.mokjang} · {student.leader}
                                  </p>
                                  {student.phone && <p className="text-xs text-gray-500">{student.phone}</p>}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => setEditingStudent(student)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>구성원 수정</DialogTitle>
                                    </DialogHeader>
                                    {editingStudent && (
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="edit-name">이름</Label>
                                          <Input
                                            id="edit-name"
                                            value={editingStudent.name}
                                            onChange={(e) =>
                                              setEditingStudent((prev) =>
                                                prev ? { ...prev, name: e.target.value } : null,
                                              )
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-mokjang">목장</Label>
                                          <Input
                                            id="edit-mokjang"
                                            value={editingStudent.mokjang}
                                            onChange={(e) =>
                                              setEditingStudent((prev) =>
                                                prev ? { ...prev, mokjang: e.target.value } : null,
                                              )
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-leader">리더</Label>
                                          <Input
                                            id="edit-leader"
                                            value={editingStudent.leader}
                                            onChange={(e) =>
                                              setEditingStudent((prev) =>
                                                prev ? { ...prev, leader: e.target.value } : null,
                                              )
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-phone">연락처</Label>
                                          <Input
                                            id="edit-phone"
                                            value={editingStudent.phone || ""}
                                            onChange={(e) =>
                                              setEditingStudent((prev) =>
                                                prev ? { ...prev, phone: e.target.value } : null,
                                              )
                                            }
                                          />
                                        </div>
                                        <Button onClick={updateStudent} className="w-full">
                                          수정하기
                                        </Button>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteStudent(student.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 border-dashed">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{displayDate}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isSearchOpen ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="이름 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base rounded-full"
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: "name" | "mokjang") => setSortBy(value)}>
                  <SelectTrigger className="flex-1 h-10 rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mokjang">목장별 정렬</SelectItem>
                    <SelectItem value="name">이름순 정렬</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterMokjang} onValueChange={setFilterMokjang}>
                  <SelectTrigger className="flex-1 h-10 rounded-full">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 목장</SelectItem>
                    {mokjangList.map((mokjang) => (
                      <SelectItem key={mokjang} value={mokjang}>
                        {mokjang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" className="w-full text-gray-500" onClick={() => setIsSearchOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                접기
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="이름 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base rounded-full"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => setIsSearchOpen(true)}
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Church className="h-4 w-4" />
              출석체크
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              통계
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={() => changeDate(-7)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                이전 주
              </Button>
              <Button variant="ghost" size="sm" onClick={() => changeDate(7)}>
                다음 주
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {sortBy === "mokjang"
              ? Object.values(groupedByMokjang).map((group) => (
                  <Card key={group.name} className="shadow-sm">
                    <Collapsible open={group.isOpen} onOpenChange={() => toggleMokjang(group.name)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg text-blue-700">{group.name}</CardTitle>
                              <p className="text-sm text-gray-600">리더: {group.leader}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {
                                  group.students.filter((s) => {
                                    const att = s.attendance[formattedDate] || { worship: false, mokjang: false }
                                    return att.worship || att.mokjang
                                  }).length
                                }
                                /{group.students.length}
                              </Badge>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${group.isOpen ? "rotate-180" : ""}`}
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          {group.students.map((student) => {
                            const attendance = student.attendance[formattedDate] || { worship: false, mokjang: false }
                            return (
                              <div
                                key={student.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <span className="text-xs font-medium text-gray-600">{student.name.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-gray-900">{student.name}</h3>
                                    <div className="flex gap-1 mt-1">
                                      {attendance.worship && (
                                        <Badge className="bg-blue-500 text-white border-0">
                                          <Church className="h-3 w-3 mr-1" />
                                          예배
                                        </Badge>
                                      )}
                                      {attendance.mokjang && (
                                        <Badge className="bg-green-500 text-white border-0">
                                          <Users className="h-3 w-3 mr-1" />
                                          목장
                                        </Badge>
                                      )}
                                      {!attendance.worship && !attendance.mokjang && (
                                        <Badge className="bg-gray-500 text-white border-0">결석</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`worship-${student.id}`}
                                      checked={attendance.worship}
                                      onCheckedChange={(checked) =>
                                        updateAttendance(student.id, "worship", checked === true)
                                      }
                                      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                    />
                                    <Label
                                      htmlFor={`worship-${student.id}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      예배
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`mokjang-${student.id}`}
                                      checked={attendance.mokjang}
                                      onCheckedChange={(checked) =>
                                        updateAttendance(student.id, "mokjang", checked === true)
                                      }
                                      className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                    />
                                    <Label
                                      htmlFor={`mokjang-${student.id}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      목장
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))
              : filteredStudents.map((student) => {
                  const attendance = student.attendance[formattedDate] || { worship: false, mokjang: false }
                  return (
                    <Card key={student.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">{student.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{student.name}</h3>
                              <p className="text-xs text-gray-500">
                                {student.mokjang} · {student.leader}
                              </p>
                              <div className="flex gap-1 mt-1">
                                {attendance.worship && (
                                  <Badge className="bg-blue-500 text-white border-0">
                                    <Church className="h-3 w-3 mr-1" />
                                    예배
                                  </Badge>
                                )}
                                {attendance.mokjang && (
                                  <Badge className="bg-green-500 text-white border-0">
                                    <Users className="h-3 w-3 mr-1" />
                                    목장
                                  </Badge>
                                )}
                                {!attendance.worship && !attendance.mokjang && (
                                  <Badge className="bg-gray-500 text-white border-0">결석</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`worship-list-${student.id}`}
                                checked={attendance.worship}
                                onCheckedChange={(checked) => updateAttendance(student.id, "worship", checked === true)}
                                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                              />
                              <Label
                                htmlFor={`worship-list-${student.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                예배
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`mokjang-list-${student.id}`}
                                checked={attendance.mokjang}
                                onCheckedChange={(checked) => updateAttendance(student.id, "mokjang", checked === true)}
                                className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                              />
                              <Label
                                htmlFor={`mokjang-list-${student.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                목장
                              </Label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <Card className="text-center">
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-blue-600">{stats.worshipCount}</div>
                  <div className="text-xs text-gray-600">예배만</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-green-600">{stats.mokjangCount}</div>
                  <div className="text-xs text-gray-600">목장만</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-purple-600">{stats.bothCount}</div>
                  <div className="text-xs text-gray-600">둘 다</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-gray-600">{stats.absentCount}</div>
                  <div className="text-xs text-gray-600">결석</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">전체 출석률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">출석률</span>
                    <span className="font-medium">
                      {Math.round(
                        ((stats.worshipCount + stats.mokjangCount + stats.bothCount) / students.length) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((stats.worshipCount + stats.mokjangCount + stats.bothCount) / students.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">목장별 출석 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mokjangList.map((mokjang) => {
                  const stats = getMokjangStats(mokjang)
                  const leader = students.find((s) => s.mokjang === mokjang)?.leader || ""
                  return (
                    <div key={mokjang} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-sm">{mokjang}</span>
                          <span className="text-xs text-gray-500 ml-2">({leader})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">
                            {stats.attended}/{stats.total}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">({stats.rate}%)</span>
                        </div>
                      </div>
                      <div className="flex text-xs text-gray-600 gap-4">
                        <span>예배만: {stats.worship}명</span>
                        <span>목장만: {stats.mokjang}명</span>
                        <span>둘 다: {stats.both}명</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${stats.rate}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
