export interface User {
  userId: string
  displayName: string
  email?: string
  avatarUrl?: string
  accessToken: string
  refreshToken: string
}

export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  shareCode: string
  isArchived: boolean
  memberCount: number
}

export interface ProjectDetail extends Project {
  members: Member[]
}

export interface Member {
  userId: string
  displayName: string
  avatarUrl?: string
  role: string
  joinedAt: string
}

export interface Observation {
  id: string
  projectId: string
  routeId?: string
  taxonName: string
  taxonId?: number
  title?: string
  description?: string
  latitude: number
  longitude: number
  altitude?: number
  observedAt: string
  photosJson?: string
  notes?: string
  quantity: number
  tagsJson?: string
  weatherCondition?: string
  temperature?: number
  humidity?: number
  habitatDescription?: string
  habitatPhotoUrl?: string
  syncStatus: string
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface Route {
  id: string
  projectId: string
  name: string
  startedAt: string
  endedAt?: string
  distanceMeters: number
  trackPointsJson?: string
  notes?: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  body: string
  latitude?: number
  longitude?: number
  createdAt: string
}

export interface Comment {
  id: string
  userId: string
  displayName: string
  avatarUrl?: string
  body: string
  createdAt: string
}

export interface ActivityItem {
  type: string
  actorName: string
  avatarUrl?: string
  description: string
  occurredAt: string
}

export interface TaxonStat { taxonName: string; count: number }
export interface DayStat   { date: string; count: number }
export interface MemberStat { displayName: string; observationCount: number }
export interface ProjectStats {
  totalObservations: number
  totalRoutes: number
  totalNotes: number
  uniqueSpecies: number
  totalDistanceKm: number
  totalFieldHours: number
  topSpecies: TaxonStat[]
  obsByDay: DayStat[]
  obsByMember: MemberStat[]
  heatmapPoints: [number, number][]
}
