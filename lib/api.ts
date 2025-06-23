// API 클라이언트 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'
const API_PREFIX = '/attendance/v1'

// 타입 정의
export interface AttendanceStatus {
  worship: boolean
  mokjang: boolean
}

export interface Student {
  id: number
  name: string
  mokjangName: string
  attendances: Array<{
    attendanceDate: string
    worship: boolean
    mokjang: boolean
  }>
}

export interface AttendanceStats {
  overall: {
    total_students: number
    worship_only: number
    mokjang_only: number
    both: number
    attended: number
    absent: number
    attendance_rate: number
  }
  by_mokjang: Array<{
    mokjang: string
    total: number
    worship_only: number
    mokjang_only: number
    both: number
    absent: number
    attendance_rate: number
  }>
}

export interface Mokjang {
  mokjang: string
  student_count: number
}

// API 클라이언트 클래스
class AttendanceAPI {
  private baseURL: string

  constructor() {
    this.baseURL = `${API_BASE_URL}${API_PREFIX}`
  }

  // 출석 관련 API
  async getAttendanceByDate(date: string) {
    const response = await fetch(`${this.baseURL}/attendance/${date}`)
    if (!response.ok) {
      if (response.status === 404) {
        return { data: [] }
      }
      throw new Error('출석 데이터 조회 실패')
    }
    
    const result = await response.json()
    return result
  }

  async getAttendanceStats(date: string): Promise<{ success: boolean; data: AttendanceStats }> {
    const response = await fetch(`${this.baseURL}/attendance/${date}/stats`)
    if (!response.ok) throw new Error('출석 통계 조회 실패')
    return response.json()
  }

  async updateAttendance(studentId: number, attendanceDate: string, worship?: boolean, mokjang?: boolean) {
    const response = await fetch(`${this.baseURL}/attendance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId,
        attendanceDate,
        worship,
        mokjang,
      }),
    })
    if (!response.ok) throw new Error('출석 업데이트 실패')
    return response.json()
  }

  // 학생 관련 API
  async getStudents(search?: string, mokjang?: string, sort?: string): Promise<{ success: boolean; data: Student[] }> {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (mokjang) params.append('mokjang', mokjang)
    if (sort) params.append('sort', sort)

    const response = await fetch(`${this.baseURL}/students?${params}`)
    if (!response.ok) throw new Error('학생 목록 조회 실패')
    
    const result = await response.json()
    
    // 서버 응답의 mokjang을 mokjangName으로 변환
    if (result.success && result.data) {
      result.data = result.data.map((student: any) => ({
        ...student,
        mokjangName: student.mokjang
      }))
    }
    
    return result
  }

  async createStudent(studentData: { name: string; mokjang: string }) {
    const response = await fetch(`${this.baseURL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    })
    if (!response.ok) throw new Error('학생 생성 실패')
    return response.json()
  }

  async updateStudent(id: number, studentData: { name: string; mokjang: string }) {
    const response = await fetch(`${this.baseURL}/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    })
    if (!response.ok) throw new Error('학생 정보 수정 실패')
    return response.json()
  }

  async deleteStudent(id: number) {
    const response = await fetch(`${this.baseURL}/students/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('학생 삭제 실패')
    return response.status === 204
  }

  async getStudentAttendance(id: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)

    const response = await fetch(`${this.baseURL}/students/${id}/attendance?${params}`)
    if (!response.ok) throw new Error('학생 출석 기록 조회 실패')
    return response.json()
  }

  // 목장 관련 API
  async getMokjangs(): Promise<{ success: boolean; data: Mokjang[] }> {
    const response = await fetch(`${this.baseURL}/mokjang`)
    if (!response.ok) throw new Error('목장 목록 조회 실패')
    return response.json()
  }
}

// 싱글톤 인스턴스 생성
export const attendanceAPI = new AttendanceAPI()

// WebSocket 관련 유틸리티
export class AttendanceWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private onMessageCallback?: (data: any) => void
  private onErrorCallback?: (error: Event) => void

  constructor(private name: string = 'Anonymous') {}

  connect(onMessage?: (data: any) => void, onError?: (error: Event) => void) {
    this.onMessageCallback = onMessage
    this.onErrorCallback = onError
    
    const wsURL = `${API_BASE_URL.replace('http', 'ws')}${API_PREFIX}?name=${encodeURIComponent(this.name)}`
    
    try {
      this.ws = new WebSocket(wsURL)

      this.ws.onopen = () => {
        console.log(`[WebSocket] 연결됨 (${this.name})`)
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.onMessageCallback?.(data)
        } catch (error) {
          console.error('WebSocket 메시지 파싱 오류:', error)
        }
      }

      this.ws.onclose = () => {
        console.log(`[WebSocket] 연결 종료 (${this.name})`)
        this.reconnect()
      }

      this.ws.onerror = (error) => {
        console.error(`[WebSocket] 오류 (${this.name}):`, error)
        this.onErrorCallback?.(error)
      }
    } catch (error) {
      console.error('WebSocket 연결 실패:', error)
      this.onErrorCallback?.(error as Event)
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`[WebSocket] 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${this.name})`)
      
      setTimeout(() => {
        this.connect(this.onMessageCallback, this.onErrorCallback)
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error(`[WebSocket] 재연결 시도 한계 초과 (${this.name})`)
    }
  }

  // 클라이언트는 수신 전용으로 사용하므로 발신 기능 제거
  // sendAttendanceUpdate는 더 이상 사용하지 않음

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected'
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'connected'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'disconnected'
      default: return 'unknown'
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export default attendanceAPI 