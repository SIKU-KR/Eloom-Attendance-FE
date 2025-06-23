"use client"

import { useState, useEffect } from "react"
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
import attendanceAPI, { Student, AttendanceStatus, AttendanceWebSocket } from "@/lib/api"

interface MokjangGroup {
  name: string
  students: Student[]
  isOpen: boolean
}

// 학생의 특정 날짜 출석 상태를 가져오는 헬퍼 함수
const getAttendanceForDate = (student: Student, date: string) => {
  // attendances 배열이 존재하는지 확인
  if (!student.attendances || !Array.isArray(student.attendances)) {
    return {
      worship: false,
      mokjang: false
    }
  }
  
  // 날짜 형식을 정규화하여 비교 (ISO 형식을 YYYY-MM-DD로 변환)
  const attendance = student.attendances.find(a => {
    const attendanceDate = new Date(a.attendanceDate).toISOString().split('T')[0]
    return attendanceDate === date
  })
  
  return {
    worship: attendance?.worship || false,
    mokjang: attendance?.mokjang || false
  }
}

export default function Component() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [wsRef, setWsRef] = useState<AttendanceWebSocket | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "mokjang">("mokjang")
  const [filterMokjang, setFilterMokjang] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [mokjangStates, setMokjangStates] = useState<Record<string, boolean>>({})
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("")

  // 관리 페이지 상태
  const [isManageSheetOpen, setIsManageSheetOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [newStudent, setNewStudent] = useState({
    name: "",
    mokjangName: "",
  })

  const formattedDate = format(selectedDate, "yyyy-MM-dd")
  const displayDate = format(selectedDate, "PPP", { locale: ko })

  // 학생 목록과 출석 데이터를 가져오는 함수
  const fetchData = async (date: string) => {
    console.log('데이터 가져오기 시작:', date)
    setLoading(true)
    setError(null)
    try {
      // 해당 날짜의 출석 데이터 가져오기 (모든 학생 정보 포함)
      console.log('출석 데이터 요청 중:', date)
      const attendanceResponse = await attendanceAPI.getAttendanceByDate(date)
      console.log('출석 데이터 응답:', attendanceResponse)
      
      if (!attendanceResponse.data) {
        throw new Error('출석 데이터를 가져오는데 실패했습니다.')
      }

      console.log('가져온 데이터:', attendanceResponse.data)
      setStudents(attendanceResponse.data)
      setLastUpdateTime(new Date().toLocaleTimeString())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '데이터를 가져오는데 실패했습니다.'
      setError(errorMessage)
      console.error('데이터 가져오기 실패:', err)
      // 에러는 콘솔에만 로그 (토스트 제거)
    } finally {
      setLoading(false)
    }
  }

  // 실시간 출석 업데이트를 처리하는 함수
  const handleWebSocketMessage = (message: any) => {
    console.log('[WebSocket] 메시지 수신:', message)
    
    if (message.type === 'attendance_updated' && message.data) {
      const { studentId, attendanceDate, worship, mokjang } = message.data
      
      // 날짜 형식 정규화 (YYYY-MM-DD)
      let normalizedDate = attendanceDate
      if (attendanceDate instanceof Date) {
        normalizedDate = attendanceDate.toISOString().split('T')[0]
      } else if (typeof attendanceDate === 'string' && attendanceDate.includes('T')) {
        normalizedDate = attendanceDate.split('T')[0]
      }
      
      // 본인의 API 요청으로 인한 브로드캐스트인지 확인
      const updateKey = `${studentId}-${normalizedDate}-${Boolean(worship)}-${Boolean(mokjang)}`
      console.log('[WebSocket] 업데이트 키 확인:', { updateKey, hasPending: pendingUpdates.has(updateKey), pendingKeys: Array.from(pendingUpdates) })
      
      if (pendingUpdates.has(updateKey)) {
        // 본인의 업데이트이므로 UI 업데이트 스킵 (이미 Optimistic UI로 처리됨)
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(updateKey)
          return newSet
        })
        console.log('[WebSocket] 본인 업데이트 브로드캐스트 - UI 업데이트 스킵')
        return
      }
      
      // 현재 선택된 날짜와 메시지의 날짜가 일치하는 경우에만 UI 업데이트
      if (normalizedDate === formattedDate) {
        setStudents(prevStudents => {
          return prevStudents.map(student => {
            if (student.id === studentId) {
              const updatedStudent = { ...student }
              
              // 출석 데이터 업데이트
              if (!updatedStudent.attendances) {
                updatedStudent.attendances = []
              }
              
              const attendanceIndex = updatedStudent.attendances.findIndex(a => {
                const aDate = new Date(a.attendanceDate).toISOString().split('T')[0]
                return aDate === normalizedDate
              })
              
              if (attendanceIndex >= 0) {
                // 기존 출석 데이터 업데이트
                updatedStudent.attendances[attendanceIndex] = {
                  ...updatedStudent.attendances[attendanceIndex],
                  worship,
                  mokjang
                }
              } else {
                // 새 출석 데이터 추가
                updatedStudent.attendances.push({
                  attendanceDate,
                  worship,
                  mokjang
                })
              }
              
              return updatedStudent
            }
            return student
          })
        })
        
        // 다른 사용자의 업데이트 - 조용히 동기화 (토스트 제거)
      }
    } else if (message.type === 'error') {
      // 웹소켓 에러 메시지 처리 (콘솔에만 로그)
      console.error('[WebSocket] 서버 에러:', message.message)
    }
  }

  // 웹소켓 연결 관리 (수신 전용)
  useEffect(() => {
    const ws = new AttendanceWebSocket('출석부 사용자')
    setWsRef(ws)
    setWsStatus('connecting')
    
    ws.connect(
      handleWebSocketMessage,
      (error) => {
        console.error('[WebSocket] 연결 오류:', error)
        setWsStatus('disconnected')
      }
    )
    
    // 연결 상태 모니터링
    const checkConnection = setInterval(() => {
      const connectionState = ws.getConnectionState()
      if (connectionState === 'connected') {
        setWsStatus('connected')
      } else if (connectionState === 'connecting') {
        setWsStatus('connecting')
      } else {
        setWsStatus('disconnected')
      }
    }, 1000)
    
    return () => {
      clearInterval(checkConnection)
      ws.disconnect()
      setWsRef(null)
      setWsStatus('disconnected')
    }
  }, []) // 컴포넌트 마운트 시 한 번만 연결

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchData(formattedDate)
  }, []) // 최초 1회만 실행

  // 날짜 변경 시 데이터 가져오기
  useEffect(() => {
    fetchData(formattedDate)
  }, [formattedDate])

  const updateAttendance = async (id: number, type: "worship" | "mokjang", value: boolean) => {
    // 현재 학생 찾기
    const studentIndex = students.findIndex(s => s.id === id)
    if (studentIndex === -1) return
    
    const student = students[studentIndex]
    const currentAttendance = getAttendanceForDate(student, formattedDate)
    
    // Optimistic UI: 즉시 로컬 상태 업데이트
    const updatedStudents = [...students]
    const updatedStudent = { ...student }
    
    // 해당 날짜의 출석 데이터가 있는지 확인하고 업데이트
    if (!updatedStudent.attendances) {
      updatedStudent.attendances = []
    }
    
    const attendanceIndex = updatedStudent.attendances.findIndex(a => {
      const attendanceDate = new Date(a.attendanceDate).toISOString().split('T')[0]
      return attendanceDate === formattedDate
    })
    
    if (attendanceIndex >= 0) {
      // 기존 출석 데이터 업데이트
      updatedStudent.attendances[attendanceIndex] = {
        ...updatedStudent.attendances[attendanceIndex],
        [type]: value
      }
    } else {
      // 새 출석 데이터 추가
      updatedStudent.attendances.push({
        attendanceDate: formattedDate,
        worship: type === "worship" ? value : false,
        mokjang: type === "mokjang" ? value : false
      })
    }
    
    updatedStudents[studentIndex] = updatedStudent
    setStudents(updatedStudents) // 즉시 UI 업데이트
    
    try {
      console.log('출석 업데이트 시작:', { id, type, value, formattedDate })
      
      const newWorship = type === "worship" ? value : currentAttendance.worship
      const newMokjang = type === "mokjang" ? value : currentAttendance.mokjang
      
      // 본인의 업데이트임을 표시하기 위해 pending 목록에 추가 (Boolean 형태로 일관성 유지)
      const updateKey = `${id}-${formattedDate}-${Boolean(newWorship)}-${Boolean(newMokjang)}`
      console.log('[Client] Pending 업데이트 추가:', { updateKey, newWorship, newMokjang })
      setPendingUpdates(prev => new Set([...prev, updateKey]))
      
      // 항상 API를 통해서만 업데이트 수행
      const result = await attendanceAPI.updateAttendance(
        id,
        formattedDate,
        newWorship,
        newMokjang
      )
      
      console.log('API를 통한 출석 업데이트 성공:', result)
      
      // 일정 시간 후에 pending 상태 정리 (웹소켓 브로드캐스트가 안 왔을 경우 대비)
      setTimeout(() => {
        const cleanupKey = `${id}-${formattedDate}-${Boolean(newWorship)}-${Boolean(newMokjang)}`
        setPendingUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(cleanupKey)
          console.log('[Client] Pending 업데이트 자동 정리:', cleanupKey)
          return newSet
        })
      }, 3000) // 3초 후 자동 정리
      
    } catch (error) {
      console.error('출석 업데이트 실패:', error)
      
      // 실패 시 pending 상태 정리
      const newWorship = type === "worship" ? value : currentAttendance.worship
      const newMokjang = type === "mokjang" ? value : currentAttendance.mokjang
      const updateKey = `${id}-${formattedDate}-${Boolean(newWorship)}-${Boolean(newMokjang)}`
      setPendingUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateKey)
        return newSet
      })
      
      // 실패 시 롤백: 원래 상태로 되돌리기
      setStudents(students)
      
      // 에러 메시지 표시
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      
      // 에러는 콘솔에만 로그 (토스트 제거)
    }
  }

  const toggleMokjang = (mokjangName: string) => {
    setMokjangStates((prev) => ({
      ...prev,
      [mokjangName]: !prev[mokjangName],
    }))
  }

  const addStudent = async () => {
    if (newStudent.name && newStudent.mokjangName) {
      try {
        const result = await attendanceAPI.createStudent({
          name: newStudent.name,
          mokjang: newStudent.mokjangName
        })
        
        // 성공 시 로컬 상태에 새 학생 추가
        if (result.success && result.data) {
          const newStudentData = {
            ...result.data,
            mokjangName: result.data.mokjang,
            attendances: []
          }
          setStudents(prev => [...prev, newStudentData])
        }
        
        setNewStudent({ name: "", mokjangName: "" })
        setIsAddDialogOpen(false)
      } catch (error) {
        console.error('Failed to add student:', error)
        // 에러는 콘솔에만 로그 (토스트 제거)
      }
    }
  }

  const updateStudent = async () => {
    if (editingStudent) {
      try {
        await attendanceAPI.updateStudent(editingStudent.id, {
          name: editingStudent.name,
          mokjang: editingStudent.mokjangName
        })
        
        // 성공 시 로컬 상태 업데이트
        setStudents(prev => 
          prev.map(student => 
            student.id === editingStudent.id 
              ? { ...student, name: editingStudent.name, mokjangName: editingStudent.mokjangName }
              : student
          )
        )
        
        setEditingStudent(null)
      } catch (error) {
        console.error('Failed to update student:', error)
        // 에러는 콘솔에만 로그 (토스트 제거)
      }
    }
  }

  const deleteStudent = async (id: number) => {
    try {
      await attendanceAPI.deleteStudent(id)
      
      // 성공 시 로컬 상태에서 해당 학생 제거
      setStudents(prev => prev.filter(student => student.id !== id))
    } catch (error) {
      console.error('Failed to delete student:', error)
              // 에러는 콘솔에만 로그 (토스트 제거)
    }
  }

  const changeDate = (increment: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + increment)
    setSelectedDate(newDate)
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMokjang = filterMokjang === "all" || student.mokjangName === filterMokjang
    return matchesSearch && matchesMokjang
  })

  const groupedByMokjang = filteredStudents.reduce(
    (groups, student) => {
      const mokjang = student.mokjangName
      if (!groups[mokjang]) {
        groups[mokjang] = {
          name: mokjang,
          students: [],
          isOpen: mokjangStates[mokjang] === true, // 기본적으로 접힌 상태로 시작
        }
      }
      groups[mokjang].students.push(student)
      return groups
    },
    {} as Record<string, MokjangGroup>,
  )

  const sortedStudents =
    sortBy === "mokjang"
      ? Object.values(groupedByMokjang).sort((a, b) => {
          // "미지정" 그룹을 맨 아래에 배치
          if (a.name === "미지정" && b.name !== "미지정") return 1
          if (a.name !== "미지정" && b.name === "미지정") return -1
          return a.name.localeCompare(b.name, "ko")
        })
      : filteredStudents.sort((a, b) => a.name.localeCompare(b.name, "ko"))

  const mokjangList = Array.from(new Set(students.map((s) => s.mokjangName))).sort((a, b) => {
    // "미지정" 그룹을 맨 아래에 배치
    if (a === "미지정" && b !== "미지정") return 1
    if (a !== "미지정" && b === "미지정") return -1
    return a.localeCompare(b, "ko")
  })

  const getAttendanceStats = () => {
    let worshipCount = 0
    let mokjangCount = 0
    let absentCount = 0

    students.forEach((student) => {
      const attendance = getAttendanceForDate(student, formattedDate)
      if (attendance.worship) worshipCount++
      if (attendance.mokjang) mokjangCount++
      if (!attendance.worship && !attendance.mokjang) absentCount++
    })

    return { worshipCount, mokjangCount, absentCount }
  }

  const stats = getAttendanceStats()

  const getMokjangStats = (mokjangName: string) => {
    const mokjangStudents = students.filter((s) => s.mokjangName === mokjangName)
    let worship = 0
    let mokjang = 0
    let absent = 0
    const total = mokjangStudents.length

    mokjangStudents.forEach((student) => {
      const attendance = getAttendanceForDate(student, formattedDate)
      if (attendance.worship) worship++
      if (attendance.mokjang) mokjang++
      if (!attendance.worship && !attendance.mokjang) absent++
    })

    const attended = total - absent
    return { worship, mokjang, absent, total, attended, rate: total > 0 ? Math.round((attended / total) * 100) : 0 }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-800 font-medium">{error}</p>
          <button
            onClick={() => fetchData(formattedDate)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">출석부</h1>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected' ? 'bg-green-500' : 
                  wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-500">
                  {wsStatus === 'connected' ? '실시간' : 
                   wsStatus === 'connecting' ? '연결중' : '오프라인 (새로고침)'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Sheet open={isManageSheetOpen} onOpenChange={setIsManageSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 px-2">
                    <UserCog className="h-4 w-4" />
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
                              value={newStudent.mokjangName}
                              onChange={(e) => setNewStudent((prev) => ({ ...prev, mokjangName: e.target.value }))}
                              placeholder="목장명을 입력하세요"
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
                                    {student.mokjangName}
                                  </p>
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
                                            value={editingStudent.mokjangName}
                                            onChange={(e) =>
                                              setEditingStudent((prev) =>
                                                prev ? { ...prev, mokjangName: e.target.value } : null,
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
                  <Button variant="outline" size="sm" className="flex items-center gap-1 border-dashed px-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">{format(selectedDate, "MM/dd", { locale: ko })}</span>
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
              ? (sortedStudents as MokjangGroup[]).map((group) => (
                  <Card key={`mokjang-${group.name || 'unnamed'}`} className="shadow-sm">
                    <Collapsible open={group.isOpen} onOpenChange={() => toggleMokjang(group.name)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="py-5 cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className={`text-lg ${group.name === "미지정" ? "text-gray-500" : "text-blue-700"}`}>
                                {group.name}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  const attendedCount = group.students.filter((s) => {
                                    const att = getAttendanceForDate(s, formattedDate)
                                    return att.worship || att.mokjang
                                  }).length
                                  return `${attendedCount}/${group.students.length}`
                                })()}
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
                            const attendance = getAttendanceForDate(student, formattedDate)
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
                                        <Badge key={`${student.id}-worship`} className="bg-blue-500 text-white border-0">
                                          <Church className="h-3 w-3 mr-1" />
                                          예배
                                        </Badge>
                                      )}
                                      {attendance.mokjang && (
                                        <Badge key={`${student.id}-mokjang`} className="bg-green-500 text-white border-0">
                                          <Users className="h-3 w-3 mr-1" />
                                          목장
                                        </Badge>
                                      )}
                                      {!attendance.worship && !attendance.mokjang && (
                                        <Badge key={`${student.id}-absent`} className="bg-gray-500 text-white border-0">결석</Badge>
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
                  const attendance = getAttendanceForDate(student, formattedDate)
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
                                {student.mokjangName}
                              </p>
                              <div className="flex gap-1 mt-1">
                                {attendance.worship && (
                                  <Badge key={`${student.id}-worship`} className="bg-blue-500 text-white border-0">
                                    <Church className="h-3 w-3 mr-1" />
                                    예배
                                  </Badge>
                                )}
                                {attendance.mokjang && (
                                  <Badge key={`${student.id}-mokjang`} className="bg-green-500 text-white border-0">
                                    <Users className="h-3 w-3 mr-1" />
                                    목장
                                  </Badge>
                                )}
                                {!attendance.worship && !attendance.mokjang && (
                                  <Badge key={`${student.id}-absent`} className="bg-gray-500 text-white border-0">결석</Badge>
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
            <div className="grid grid-cols-3 gap-2">
              <Card className="text-center">
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-blue-600">{stats.worshipCount}</div>
                  <div className="text-xs text-gray-600">예배 참여</div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-green-600">{stats.mokjangCount}</div>
                  <div className="text-xs text-gray-600">목장 참여</div>
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
                        ((students.length - stats.absentCount) / students.length) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((students.length - stats.absentCount) / students.length) * 100}%`,
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
                  return (
                    <div key={mokjang} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-sm">{mokjang}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">
                            {stats.attended}/{stats.total}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">({stats.rate}%)</span>
                        </div>
                      </div>
                      <div className="flex text-xs text-gray-600 gap-4">
                        <span>예배: {stats.worship}명</span>
                        <span>목장: {stats.mokjang}명</span>
                        <span>결석: {stats.absent}명</span>
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
