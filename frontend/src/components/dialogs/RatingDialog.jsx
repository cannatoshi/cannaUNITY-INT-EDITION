// frontend/src/components/dialogs/RatingDialog.jsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Rating,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Fade,
  Zoom,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Alert
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PersonIcon from '@mui/icons-material/Person'
import HistoryIcon from '@mui/icons-material/History'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import ScienceIcon from '@mui/icons-material/Science'
import NatureIcon from '@mui/icons-material/Nature'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AddIcon from '@mui/icons-material/Add'
import api from '@/utils/api'

const RatingDialog = ({ 
  open, 
  onClose, 
  batch, 
  plant,
  onRatingCreated 
}) => {
  // States für Bewertung
  const [overallHealth, setOverallHealth] = useState(5)
  const [growthStructure, setGrowthStructure] = useState(5)
  const [regenerationAbility, setRegenerationAbility] = useState(5)
  const [regrowthSpeed, setRegrowthSpeed] = useState('normal')
  const [regrowthSpeedRating, setRegrowthSpeedRating] = useState(5)
  const [cuttingsHarvested, setCuttingsHarvested] = useState(0)
  const [cuttingQuality, setCuttingQuality] = useState(5)
  const [rootingSuccessRate, setRootingSuccessRate] = useState(null)
  const [healthNotes, setHealthNotes] = useState('')
  const [growthNotes, setGrowthNotes] = useState('')
  const [regenerationNotes, setRegenerationNotes] = useState('')
  
  // States für RFID-Verifizierung
  const [scanMode, setScanMode] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [scannedMemberName, setScannedMemberName] = useState('')
  const [loading, setLoading] = useState(false)
  const [abortController, setAbortController] = useState(null)
  const [isAborting, setIsAborting] = useState(false)
  const [memberId, setMemberId] = useState(null)
  
  // State für Historie
  const [ratingHistory, setRatingHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // NEU: States für Historie-Ansicht
  const [viewMode, setViewMode] = useState('new') // 'new' oder 'history'
  const [selectedHistoryId, setSelectedHistoryId] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Lade Bewertungs-Historie
  const loadRatingHistory = async () => {
    if (!plant?.id) return
    
    setLoadingHistory(true)
    try {
      const response = await api.get(`/trackandtrace/motherplant-ratings/?mother_plant_id=${plant.id}`)
      setRatingHistory(response.data.results || [])
    } catch (error) {
      console.error('Fehler beim Laden der Historie:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // NEU: Funktion zum Laden einer historischen Bewertung
  const loadHistoricRating = (rating) => {
    setOverallHealth(rating.overall_health || 5)
    setGrowthStructure(rating.growth_structure || 5)
    setRegenerationAbility(rating.regeneration_ability || 5)
    setRegrowthSpeed(rating.regrowth_speed || 'normal')
    setRegrowthSpeedRating(rating.regrowth_speed_rating || 5)
    setCuttingsHarvested(rating.cuttings_harvested || 0)
    setCuttingQuality(rating.cutting_quality || 5)
    setRootingSuccessRate(rating.rooting_success_rate)
    setHealthNotes(rating.health_notes || '')
    setGrowthNotes(rating.growth_notes || '')
    setRegenerationNotes(rating.regeneration_notes || '')
    
    setSelectedHistoryId(rating.id)
    setViewMode('history')
    setIsReadOnly(true)
  }

  // NEU: Funktion zum Zurücksetzen auf neue Bewertung
  const resetToNewRating = () => {
    setOverallHealth(5)
    setGrowthStructure(5)
    setRegenerationAbility(5)
    setRegrowthSpeed('normal')
    setRegrowthSpeedRating(5)
    setCuttingsHarvested(0)
    setCuttingQuality(5)
    setRootingSuccessRate(null)
    setHealthNotes('')
    setGrowthNotes('')
    setRegenerationNotes('')
    
    setSelectedHistoryId(null)
    setViewMode('new')
    setIsReadOnly(false)
  }

  // Dialog zurücksetzen beim Öffnen
  useEffect(() => {
    if (open && plant) {
      // Auf neue Bewertung zurücksetzen
      resetToNewRating()
      
      // RFID-States zurücksetzen
      setScanMode(false)
      setScanSuccess(false)
      setScannedMemberName('')
      setMemberId(null)
      setAbortController(null)
      setIsAborting(false)
      
      // Historie laden
      loadRatingHistory()
    }
  }, [open, plant])

  // RFID-Scan starten
  const startRfidScan = async () => {
    setScanMode(true)
    setScanSuccess(false)
    await handleRfidScan()
  }

  // RFID-Scan Handler
  const handleRfidScan = async () => {
    if (isAborting) return
    
    const controller = new AbortController()
    setAbortController(controller)
    setLoading(true)
    
    try {
      console.log("🚀 Starte RFID-Scan für Bewertung...")
      
      // 1. Karte scannen
      const bindRes = await api.get('/unifi_api_debug/bind-rfid-session/', {
        signal: controller.signal
      })
      
      if (isAborting) return
      
      const { token, unifi_user_id, unifi_name } = bindRes.data
      
      if (!token || !unifi_user_id || !unifi_name) {
        throw new Error('RFID-Zuweisung fehlgeschlagen.')
      }
      
      // 2. Mitglied validieren
      const verifyRes = await api.post('/unifi_api_debug/secure-member-binding/', 
        { token, unifi_name }, 
        { signal: controller.signal }
      )
      
      const { member_id, member_name } = verifyRes.data
      
      // Erfolg setzen
      setMemberId(member_id)
      setScannedMemberName(member_name)
      setScanSuccess(true)
      
      // Bewertung speichern
      setTimeout(async () => {
        await handleSaveRating(member_id)
        
        // Nach 2 Sekunden schließen
        setTimeout(() => {
          handleDialogClose()
        }, 2000)
      }, 500)
      
    } catch (error) {
      if (error.name === 'AbortError' || isAborting) {
        console.log('RFID-Scan wurde abgebrochen')
      } else {
        console.error('RFID-Fehler:', error)
        alert(error.response?.data?.detail || error.message || 'RFID-Verifizierung fehlgeschlagen')
      }
      
      if (!isAborting) {
        setScanMode(false)
      }
    } finally {
      if (!isAborting) {
        setLoading(false)
      }
    }
  }

  // RFID-Scan abbrechen
  const handleCancelScan = async () => {
    setIsAborting(true)
    
    if (abortController) {
      abortController.abort()
    }
    
    try {
      await api.post('/unifi_api_debug/cancel-rfid-session/')
      console.log("RFID-Scan abgebrochen")
    } catch (error) {
      console.error('Abbruch fehlgeschlagen:', error)
    } finally {
      setScanMode(false)
      setLoading(false)
      setScanSuccess(false)
      setScannedMemberName('')
      setTimeout(() => {
        setIsAborting(false)
      }, 500)
    }
  }

  // Bewertung speichern
  const handleSaveRating = async (rfidMemberId) => {
    try {
      const ratingData = {
        mother_plant: plant.id,
        overall_health: overallHealth,
        health_notes: healthNotes,
        growth_structure: growthStructure,
        growth_notes: growthNotes,
        regeneration_ability: regenerationAbility,
        regeneration_notes: regenerationNotes,
        regrowth_speed: regrowthSpeed,
        regrowth_speed_rating: regrowthSpeedRating,
        cuttings_harvested: cuttingsHarvested,
        cutting_quality: cuttingQuality,
        rooting_success_rate: rootingSuccessRate,
        rated_by_id: rfidMemberId
      }
      
      await api.post('/trackandtrace/motherplant-ratings/', ratingData)
      
      if (onRatingCreated) {
        onRatingCreated()
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Bewertung:', error)
      alert('Fehler beim Speichern der Bewertung')
    }
  }

  // Dialog schließen
  const handleDialogClose = () => {
    setScanMode(false)
    setScanSuccess(false)
    setScannedMemberName('')
    setMemberId(null)
    
    if (onClose) {
      onClose()
    }
  }

  // Berechne Gesamtbewertung
  const calculateOverallScore = () => {
    const scores = [
      overallHealth,
      growthStructure,
      regenerationAbility,
      regrowthSpeedRating,
      cuttingQuality
    ]
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  }

  // Formatiere Regrowth Speed für Anzeige
  const formatRegrowthSpeed = (speed) => {
    const speedMap = {
      'very_fast': 'Sehr schnell',
      'fast': 'Schnell',
      'normal': 'Normal',
      'slow': 'Langsam'
    }
    return speedMap[speed] || speed
  }

  if (!plant) {
    return null
  }

  return (
    <Dialog 
      open={open} 
      onClose={(event, reason) => {
        if (scanMode && !scanSuccess) {
          return
        }
        if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
          handleDialogClose()
        }
      }}
      fullScreen
      disableEscapeKeyDown
      PaperProps={{
        sx: { 
          position: 'fixed',
          overflow: 'hidden',
          width: '1920px',
          height: '1080px',
          maxWidth: '1920px',
          maxHeight: '1080px',
          margin: 'auto',
          bgcolor: '#f8f9fa'
        }
      }}
    >
      {/* RFID-Scan-Overlay */}
      {scanMode && (
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: '#2e7d32',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          zIndex: 1300
        }}>
          {!scanSuccess && (
            <Button 
              onClick={handleCancelScan}
              variant="contained" 
              color="error"
              size="medium"
              sx={{ 
                position: 'absolute',
                top: 20,
                right: 20,
                minWidth: '120px',
                height: '40px'
              }}
            >
              Abbrechen
            </Button>
          )}
          
          {scanSuccess ? (
            <Fade in={scanSuccess}>
              <Box sx={{ textAlign: 'center' }}>
                <Zoom in={scanSuccess}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 120, color: 'white', mb: 2 }} />
                </Zoom>
                
                <Typography variant="h3" color="white" fontWeight="500" gutterBottom>
                  Bewertung erfolgreich gespeichert
                </Typography>
                
                <Typography variant="h5" color="white" sx={{ mt: 2 }}>
                  Mutterpflanze {plant.batch_number} | Bewertung: {calculateOverallScore()}
                </Typography>
                
                <Typography variant="h5" color="white" sx={{ mt: 2 }}>
                  Bewerter: {scannedMemberName}
                </Typography>
              </Box>
            </Fade>
          ) : (
            <>
              <CreditCardIcon sx={{ fontSize: 120, color: 'white', mb: 2 }} />
              
              <Typography variant="h3" color="white" fontWeight="300" gutterBottom>
                RFID-Authentifizierung erforderlich
              </Typography>
              
              <Typography variant="h5" color="white" fontWeight="300" gutterBottom>
                Bitte Mitarbeiterausweis scannen
              </Typography>
              
              {loading && (
                <CircularProgress 
                  size={80} 
                  thickness={4} 
                  sx={{ color: 'white', mt: 3 }} 
                />
              )}
            </>
          )}
        </Box>
      )}

      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        bgcolor: '#2e7d32',
        color: 'white',
        px: 3,
        height: '70px',
        borderBottom: '2px solid #2e7d32'
      }}>
        <LocalHospitalIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" sx={{ fontWeight: 300 }}>
          Mutterpflanzenbewertung
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 3 }}>
          <Typography variant="h6">ID: {plant.batch_number}</Typography>
          <Typography variant="h6">Genetik: {batch?.seed_strain || 'N/A'}</Typography>
          <Typography variant="h6">Datum: {new Date().toLocaleDateString('de-DE')}</Typography>
        </Box>
      </Box>

      {/* NEU: Status-Bar für Ansichtsmodus */}
      {viewMode === 'history' && (
        <Alert 
          severity="info" 
          sx={{ 
            borderRadius: 0,
            '& .MuiAlert-icon': { fontSize: 28 }
          }}
          action={
            <Button 
              color="inherit" 
              size="small"
              startIcon={<AddIcon />}
              onClick={resetToNewRating}
              sx={{ fontWeight: 'bold' }}
            >
              Neue Bewertung erstellen
            </Button>
          }
        >
          <Typography variant="body1">
            <strong>Historische Bewertung vom {selectedHistoryId && ratingHistory.find(r => r.id === selectedHistoryId) ? 
              new Date(ratingHistory.find(r => r.id === selectedHistoryId).created_at).toLocaleDateString('de-DE') : 
              'N/A'}</strong> - Nur Ansicht
          </Typography>
        </Alert>
      )}

      {/* Content */}
      <Box sx={{ 
        p: 3, 
        display: 'flex',
        gap: 3,
        height: viewMode === 'history' ? 'calc(100vh - 70px - 80px - 52px)' : 'calc(100vh - 70px - 80px)', // Alert height berücksichtigen
      }}>
        {/* Hauptbereich - 3 Spalten */}
        <Box sx={{ 
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 3
        }}>
          {/* Spalte 1: Gesundheitsbewertung */}
          <Card sx={{ bgcolor: 'white', boxShadow: 2, opacity: isReadOnly ? 0.95 : 1 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ScienceIcon sx={{ mr: 1.5, fontSize: 28, color: '#2e7d32' }} />
                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                  Pflanzengesundheit
                </Typography>
              </Box>
              
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Allgemeine Gesundheit */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    Allgemeine Pflanzengesundheit
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Rating
                      value={overallHealth}
                      onChange={(e, value) => !isReadOnly && setOverallHealth(value)}
                      max={10}
                      size="large"
                      readOnly={isReadOnly}
                    />
                    <Typography variant="h6" sx={{ minWidth: '50px' }}>{overallHealth}/10</Typography>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Klinische Notizen"
                    value={healthNotes}
                    onChange={(e) => !isReadOnly && setHealthNotes(e.target.value)}
                    multiline
                    rows={6}
                    variant="outlined"
                    InputProps={{ readOnly: isReadOnly }}
                  />
                </Box>

                {/* Wuchsstruktur */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    Wuchsstruktur und Verzweigung
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Rating
                      value={growthStructure}
                      onChange={(e, value) => !isReadOnly && setGrowthStructure(value)}
                      max={10}
                      size="large"
                      readOnly={isReadOnly}
                    />
                    <Typography variant="h6" sx={{ minWidth: '50px' }}>{growthStructure}/10</Typography>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Strukturelle Beobachtungen"
                    value={growthNotes}
                    onChange={(e) => !isReadOnly && setGrowthNotes(e.target.value)}
                    multiline
                    rows={6}
                    variant="outlined"
                    InputProps={{ readOnly: isReadOnly }}
                  />
                </Box>

                {/* Regeneration */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    Regenerationsfähigkeit nach Schnitt
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Rating
                      value={regenerationAbility}
                      onChange={(e, value) => !isReadOnly && setRegenerationAbility(value)}
                      max={10}
                      size="large"
                      readOnly={isReadOnly}
                    />
                    <Typography variant="h6" sx={{ minWidth: '50px' }}>{regenerationAbility}/10</Typography>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Regenerationsprotokoll"
                    value={regenerationNotes}
                    onChange={(e) => !isReadOnly && setRegenerationNotes(e.target.value)}
                    multiline
                    rows={6}
                    variant="outlined"
                    InputProps={{ readOnly: isReadOnly }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Spalte 2: Produktionsdaten */}
          <Card sx={{ bgcolor: 'white', boxShadow: 2, opacity: isReadOnly ? 0.95 : 1 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <NatureIcon sx={{ mr: 1.5, fontSize: 28, color: '#388e3c' }} />
                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                  Produktionsdaten
                </Typography>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Nachwachsgeschwindigkeit */}
                <Box>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel>Nachwachsgeschwindigkeit</InputLabel>
                    <Select
                      value={regrowthSpeed}
                      onChange={(e) => !isReadOnly && setRegrowthSpeed(e.target.value)}
                      label="Nachwachsgeschwindigkeit"
                    >
                      <MenuItem value="very_fast">Sehr schnell (&lt; 7 Tage)</MenuItem>
                      <MenuItem value="fast">Schnell (7-14 Tage)</MenuItem>
                      <MenuItem value="normal">Normal (14-21 Tage)</MenuItem>
                      <MenuItem value="slow">Langsam (&gt; 21 Tage)</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Bewertung</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Rating
                        value={regrowthSpeedRating}
                        onChange={(e, value) => !isReadOnly && setRegrowthSpeedRating(value)}
                        max={10}
                        size="medium"
                        readOnly={isReadOnly}
                      />
                      <Typography variant="body1">{regrowthSpeedRating}/10</Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                {/* Erntedaten */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                    Erntedaten
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Anzahl geernteter Stecklinge"
                        type="number"
                        value={cuttingsHarvested}
                        onChange={(e) => !isReadOnly && setCuttingsHarvested(parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, readOnly: isReadOnly }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Bewurzelungs-Erfolgsquote (%)"
                        type="number"
                        value={rootingSuccessRate || ''}
                        onChange={(e) => !isReadOnly && setRootingSuccessRate(e.target.value ? parseFloat(e.target.value) : null)}
                        inputProps={{ min: 0, max: 100, step: 0.1, readOnly: isReadOnly }}
                        helperText="Optional - Prozentuale Erfolgsquote"
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                {/* Qualität */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    Qualität der Stecklinge
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Rating
                      value={cuttingQuality}
                      onChange={(e, value) => !isReadOnly && setCuttingQuality(value)}
                      max={10}
                      size="large"
                      readOnly={isReadOnly}
                    />
                    <Typography variant="h6">{cuttingQuality}/10</Typography>
                  </Box>
                </Box>

                {/* Gesamtbewertung */}
                <Box sx={{ 
                  mt: 'auto',
                  p: 3, 
                  bgcolor: isReadOnly ? '#e8f5e9' : '#ecf5f0ff',
                  borderRadius: 2,
                  textAlign: 'center'
                }}>
                  <Typography variant="h6" sx={{ color: '#2e7d32', mb: 1 }}>
                    {isReadOnly ? 'Historische Gesamtbewertung' : 'Gesamtbewertung'}
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {calculateOverallScore()}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32' }}>
                    von 10.0
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Spalte 3: Historie */}
          <Card sx={{ bgcolor: 'white', boxShadow: 2 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <HistoryIcon sx={{ mr: 1.5, fontSize: 28, color: '#2e7d32' }} />
                <Typography variant="h5" sx={{ fontWeight: 500 }}>
                  Bewertungshistorie
                </Typography>
                <Chip 
                  label={`${ratingHistory.length} Einträge`}
                  size="small"
                  sx={{ ml: 'auto' }}
                />
              </Box>

              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={40} />
                  </Box>
                ) : ratingHistory.length === 0 ? (
                  <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'text.secondary'
                  }}>
                    <Typography variant="body1">
                      Keine vorherigen Bewertungen vorhanden
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ 
                    height: '100%',
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#bdbdbd',
                      borderRadius: '4px',
                    },
                  }}>
                    {ratingHistory.map((rating, index) => {
                      // Berechne die Gesamtbewertung für historische Einträge
                      const historicalScore = rating.overall_score || (
                        (rating.overall_health + rating.growth_structure + rating.regeneration_ability + 
                         rating.regrowth_speed_rating + rating.cutting_quality) / 5
                      ).toFixed(1)
                      
                      return (
                        <Box key={rating.id}>
                          <Paper
                            elevation={0}
                            sx={{ 
                              border: selectedHistoryId === rating.id ? '2px solid #2e7d32' : '1px solid #e0e0e0',
                              borderRadius: 2,
                              mb: 2,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                boxShadow: 2,
                                borderColor: selectedHistoryId === rating.id ? '#2e7d32' : '#bdbdbd'
                              }
                            }}
                            onClick={() => loadHistoricRating(rating)}
                          >
                            {/* Header mit Datum und Bewerter */}
                            <Box sx={{ 
                              bgcolor: '#f5f5f5',
                              px: 2,
                              py: 1.5,
                              borderBottom: '1px solid #e0e0e0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {new Date(rating.created_at).toLocaleDateString('de-DE', { 
                                    day: '2-digit', 
                                    month: 'long', 
                                    year: 'numeric' 
                                  })} • {new Date(rating.created_at).toLocaleTimeString('de-DE', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} Uhr
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Bewertet von: {rating.rated_by?.display_name || 'Unbekannt'}
                                </Typography>
                              </Box>
                              <VisibilityIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            </Box>
                            
                            {/* Hauptinhalt */}
                            <Box sx={{ p: 2 }}>
                              <Grid container spacing={2} alignItems="stretch">
                                {/* Linke Seite: Gesamtbewertung */}
                                <Grid item xs={3}>
                                  <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    borderRight: '1px solid #e0e0e0',
                                    pr: 2
                                  }}>
                                    <Box sx={{
                                      bgcolor: historicalScore >= 8 ? '#2e7d32' : 
                                              historicalScore >= 6 ? '#ff9800' : '#f44336',
                                      color: 'white',
                                      borderRadius: 2,
                                      px: 3,
                                      py: 2,
                                      textAlign: 'center',
                                      minWidth: '100px'
                                    }}>
                                      <Typography variant="h3" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                                        {historicalScore}
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontSize: '0.75rem', letterSpacing: 1 }}>
                                        RATING
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Grid>
                                
                                {/* Mitte: Produktionsdaten */}
                                <Grid item xs={4}>
                                  <Box sx={{ 
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    borderRight: '1px solid #e0e0e0',
                                    pr: 2
                                  }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                      Produktionsdaten
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      <Chip 
                                        label={`${rating.cuttings_harvested} Stecklinge`}
                                        size="small"
                                        icon={<NatureIcon sx={{ fontSize: 16 }} />}
                                        sx={{ alignSelf: 'flex-start' }}
                                      />
                                      <Chip 
                                        label={formatRegrowthSpeed(rating.regrowth_speed)}
                                        size="small"
                                        sx={{ alignSelf: 'flex-start' }}
                                      />
                                      {rating.rooting_success_rate && (
                                        <Chip 
                                          label={`${rating.rooting_success_rate}% Erfolg`}
                                          size="small"
                                          color="success"
                                          variant="filled"
                                          sx={{ alignSelf: 'flex-start' }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                </Grid>
                                
                                {/* Rechte Seite: Einzelbewertungen */}
                                <Grid item xs={5}>
                                  <Box sx={{ 
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                  }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                      Detailbewertungen
                                    </Typography>
                                    <Grid container spacing={2}>
                                      <Grid item xs={4}>
                                        <Box sx={{ textAlign: 'center' }}>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            Gesundheit
                                          </Typography>
                                          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                            {rating.overall_health}/10
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={4}>
                                        <Box sx={{ textAlign: 'center' }}>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            Struktur
                                          </Typography>
                                          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                            {rating.growth_structure}/10
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={4}>
                                        <Box sx={{ textAlign: 'center' }}>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            Regeneration
                                          </Typography>
                                          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                            {rating.regeneration_ability}/10
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Box>
                          </Paper>
                        </Box>
                      )
                    })}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ 
        p: 2,
        bgcolor: '#f5f5f5',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '80px'
      }}>
        <Button 
          onClick={handleDialogClose} 
          variant="outlined"
          size="large"
          sx={{ minWidth: '150px', height: '50px' }}
        >
          Abbrechen
        </Button>
        
        <Typography variant="body2" color="text.secondary">
          cannaUNITY Cannabis Qualitätssicherung
        </Typography>

        {isReadOnly ? (
          <Button 
            onClick={resetToNewRating}
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            sx={{ 
              minWidth: '350px', 
              height: '50px',
              bgcolor: '#2b772fff',
              '&:hover': {
                bgcolor: '#165719ff'
              }
            }}
          >
            Neue Bewertung erstellen
          </Button>
        ) : (
          <Button 
            onClick={startRfidScan}
            variant="contained"
            size="large"
            disabled={loading || cuttingsHarvested === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <CreditCardIcon />}
            sx={{ 
              minWidth: '350px', 
              height: '50px',
              bgcolor: '#2b772fff',
              '&:hover': {
                bgcolor: '#165719ff'
              }
            }}
          >
            Mit RFID autorisieren & speichern
          </Button>
        )}
      </Box>
    </Dialog>
  )
}

export default RatingDialog