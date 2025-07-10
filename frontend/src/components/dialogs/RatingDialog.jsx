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
  Grid
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PersonIcon from '@mui/icons-material/Person'
import HistoryIcon from '@mui/icons-material/History'
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

  // Dialog zurücksetzen beim Öffnen
  useEffect(() => {
    if (open && plant) {
      // States zurücksetzen
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
          overflow: scanMode ? 'hidden' : 'hidden',
          width: '100vw',
          height: '100vh',
          maxWidth: '1920px',
          maxHeight: '1080px',
          margin: 'auto'
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
          bgcolor: 'primary.light',
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
                
                <Typography variant="h3" color="white" fontWeight="bold" gutterBottom>
                  Bewertung gespeichert!
                </Typography>
                
                <Typography variant="h5" color="white" sx={{ mt: 2 }}>
                  Mutterpflanze {plant.batch_number} wurde mit ⭐ {calculateOverallScore()} bewertet
                </Typography>
                
                <Typography variant="h4" color="white" fontWeight="bold" sx={{ mt: 2 }}>
                  Bewertet von: {scannedMemberName}
                </Typography>
              </Box>
            </Fade>
          ) : (
            <>
              <CreditCardIcon sx={{ fontSize: 120, color: 'white', mb: 2 }} />
              
              <Typography variant="h3" color="white" fontWeight="bold" gutterBottom>
                Bitte Ausweis jetzt scannen
              </Typography>
              
              <Typography variant="h5" color="white" gutterBottom>
                um die Bewertung zu speichern
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

      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 1.5,
        px: 3,
        height: '60px'
      }}>
        <StarIcon sx={{ color: 'warning.main', mr: 2, fontSize: 36 }} />
        <Typography variant="h4">
          Mutterpflanze bewerten: {plant.batch_number}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 2, 
        display: 'flex',
        gap: 2,
        height: 'calc(100vh - 60px - 70px)', // Title + Actions
        bgcolor: '#f5f5f5'
      }}>
        {/* Linke Spalte: Bewertungsformular (75%) */}
        <Box sx={{ 
          flex: '0 0 75%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {/* Info-Header */}
          <Paper sx={{ 
            p: 2, 
            bgcolor: '#e3f2fd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="h6"><strong>Pflanze:</strong> {plant.batch_number}</Typography>
              <Typography variant="h6"><strong>Genetik:</strong> {batch?.seed_strain || 'Unbekannt'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="h6"><strong>Erstellt:</strong> {new Date(plant.created_at).toLocaleDateString('de-DE')}</Typography>
              <Typography variant="h6"><strong>Bisherige Bewertungen:</strong> {ratingHistory.length}</Typography>
            </Box>
          </Paper>

          {/* Obere Zeile: Drei Hauptbewertungen */}
          <Box sx={{ display: 'flex', gap: 2, height: '45%' }}>
            {/* Gesundheit */}
            <Paper sx={{ flex: 1, p: 2.5, bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                Allgemeine Pflanzengesundheit
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
                <Rating
                  value={overallHealth}
                  onChange={(e, value) => setOverallHealth(value)}
                  max={10}
                  size="large"
                  sx={{ fontSize: '2.5rem' }}
                />
                <Typography variant="h3">{overallHealth}/10</Typography>
              </Box>
              <TextField
                fullWidth
                label="Notizen zur Gesundheit"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                sx={{ mt: 'auto' }}
              />
            </Paper>

            {/* Wuchs */}
            <Paper sx={{ flex: 1, p: 2.5, bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                Wuchsstruktur und Verzweigung
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
                <Rating
                  value={growthStructure}
                  onChange={(e, value) => setGrowthStructure(value)}
                  max={10}
                  size="large"
                  sx={{ fontSize: '2.5rem' }}
                />
                <Typography variant="h3">{growthStructure}/10</Typography>
              </Box>
              <TextField
                fullWidth
                label="Notizen zum Wuchs"
                value={growthNotes}
                onChange={(e) => setGrowthNotes(e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                sx={{ mt: 'auto' }}
              />
            </Paper>

            {/* Regeneration */}
            <Paper sx={{ flex: 1, p: 2.5, bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                Regenerationsfähigkeit nach Schnitt
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
                <Rating
                  value={regenerationAbility}
                  onChange={(e, value) => setRegenerationAbility(value)}
                  max={10}
                  size="large"
                  sx={{ fontSize: '2.5rem' }}
                />
                <Typography variant="h3">{regenerationAbility}/10</Typography>
              </Box>
              <TextField
                fullWidth
                label="Notizen zur Regeneration"
                value={regenerationNotes}
                onChange={(e) => setRegenerationNotes(e.target.value)}
                multiline
                rows={3}
                variant="outlined"
                sx={{ mt: 'auto' }}
              />
            </Paper>
          </Box>

          {/* Untere Zeile: Details & Score */}
          <Box sx={{ display: 'flex', gap: 2, height: '45%' }}>
            {/* Details Box */}
            <Paper sx={{ flex: '0 0 70%', p: 3, bgcolor: 'white' }}>
              <Grid container spacing={3} sx={{ height: '100%' }} alignItems="center">
                {/* Nachwachsgeschwindigkeit */}
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Nachwachsgeschwindigkeit</InputLabel>
                    <Select
                      value={regrowthSpeed}
                      onChange={(e) => setRegrowthSpeed(e.target.value)}
                      label="Nachwachsgeschwindigkeit"
                      sx={{ height: '60px', fontSize: '1.1rem' }}
                    >
                      <MenuItem value="very_fast">Sehr schnell (&lt; 7 Tage)</MenuItem>
                      <MenuItem value="fast">Schnell (7-14 Tage)</MenuItem>
                      <MenuItem value="normal">Normal (14-21 Tage)</MenuItem>
                      <MenuItem value="slow">Langsam (&gt; 21 Tage)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="h6" gutterBottom>Bewertung Nachwachsgeschwindigkeit</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Rating
                      value={regrowthSpeedRating}
                      onChange={(e, value) => setRegrowthSpeedRating(value)}
                      max={10}
                      size="large"
                      sx={{ fontSize: '1.8rem' }}
                    />
                    <Typography variant="h4">{regrowthSpeedRating}/10</Typography>
                  </Box>
                </Grid>

                {/* Stecklinge Daten */}
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Anzahl geernteter Stecklinge"
                    type="number"
                    value={cuttingsHarvested}
                    onChange={(e) => setCuttingsHarvested(parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0 }}
                    sx={{ 
                      '& input': { fontSize: '1.3rem', height: '40px' },
                      '& label': { fontSize: '1.1rem' }
                    }}
                  />
                </Grid>

                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Bewurzelungs-Erfolgsquote (%)"
                    type="number"
                    value={rootingSuccessRate || ''}
                    onChange={(e) => setRootingSuccessRate(e.target.value ? parseFloat(e.target.value) : null)}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    placeholder="Optional"
                    sx={{ 
                      '& input': { fontSize: '1.3rem', height: '40px' },
                      '& label': { fontSize: '1.1rem' }
                    }}
                  />
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="h6" gutterBottom>Qualität der Stecklinge</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Rating
                      value={cuttingQuality}
                      onChange={(e, value) => setCuttingQuality(value)}
                      max={10}
                      size="large"
                      sx={{ fontSize: '1.8rem' }}
                    />
                    <Typography variant="h4">{cuttingQuality}/10</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Gesamtbewertung */}
            <Paper sx={{ 
              flex: '0 0 30%', 
              p: 3, 
              bgcolor: '#fff3e0',
              border: '4px solid #ffb74d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ mb: 2, color: '#f57c00' }}>
                  Gesamtbewertung
                </Typography>
                <Typography variant="h1" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                  ⭐ {calculateOverallScore()}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Rechte Spalte: Historie (25%) */}
        <Paper sx={{ 
          flex: '0 0 25%',
          p: 2.5,
          bgcolor: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon sx={{ mr: 1.5, fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Bewertungshistorie
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={40} />
            </Box>
          ) : ratingHistory.length === 0 ? (
            <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 4 }}>
              Noch keine Bewertungen vorhanden
            </Typography>
          ) : (
            <List sx={{ 
              flex: 1, 
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
            }}>
              {ratingHistory.map((rating, index) => (
                <Box key={rating.id}>
                  <ListItem alignItems="flex-start" sx={{ py: 2, px: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                        <StarIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{ ml: 1 }}
                      primary={
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h5">
                              ⭐ {rating.overall_score}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(rating.created_at).toLocaleDateString('de-DE')}
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {new Date(rating.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PersonIcon sx={{ fontSize: 20, mr: 0.5 }} />
                            {rating.rated_by?.display_name || 'Unbekannt'}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                            <Chip 
                              label={`${rating.cuttings_harvested} Stecklinge`}
                              sx={{ fontSize: '0.9rem' }}
                            />
                            <Chip 
                              label={formatRegrowthSpeed(rating.regrowth_speed)}
                              sx={{ fontSize: '0.9rem' }}
                            />
                            {rating.rooting_success_rate && (
                              <Chip 
                                label={`${rating.rooting_success_rate}% Erfolg`}
                                color="success"
                                sx={{ fontSize: '0.9rem' }}
                              />
                            )}
                          </Box>
                          {rating.health_notes && (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                              "{rating.health_notes}"
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                  {index < ratingHistory.length - 1 && <Divider variant="inset" component="li" />}
                </Box>
              ))}
            </List>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ 
        p: 2, 
        bgcolor: 'grey.100',
        display: 'flex',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        <Button 
          onClick={handleDialogClose} 
          size="large"
          sx={{ minWidth: '150px', height: '50px', fontSize: '1.1rem' }}
        >
          Abbrechen
        </Button>
        <Button 
          onClick={startRfidScan}
          variant="contained"
          color="primary"
          size="large"
          disabled={loading || cuttingsHarvested === 0}
          startIcon={loading ? <CircularProgress size={24} /> : <CreditCardIcon />}
          sx={{ minWidth: '400px', height: '50px', fontSize: '1.2rem' }}
        >
          Mit RFID autorisieren & speichern
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RatingDialog