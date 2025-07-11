// frontend/src/apps/trackandtrace/pages/MotherPlant/components/MotherPlantTable.jsx
import { useState, useEffect } from 'react'
import { 
  Box, Typography, Button, IconButton, Tooltip, Checkbox, 
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Paper, FormControlLabel, Pagination, CircularProgress, Badge
} from '@mui/material'
import ScienceIcon from '@mui/icons-material/Science'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import StarIcon from '@mui/icons-material/Star'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'

// API-Client importieren
import api from '@/utils/api'

import TableHeader from '@/components/common/TableHeader'
import AccordionRow from '@/components/common/AccordionRow'
import DetailCards from '@/components/common/DetailCards'
import PaginationFooter from '@/components/common/PaginationFooter'
import LoadingIndicator from '@/components/common/LoadingIndicator'

/**
 * MotherPlantTable Komponente für die Darstellung der Mutterpflanzen-Tabelle
 * 
 * WICHTIGER HINWEIS:
 * Diese Komponente wurde von einem System mit mehreren Pflanzen pro Charge
 * auf ein System mit nur einer Pflanze pro Charge umgestellt.
 * 
 * Problem: Die Plant-Daten werden separat geladen (durch onExpandBatch),
 * obwohl es jetzt nur noch eine Pflanze pro Batch gibt.
 * 
 * Ideale Lösung: Die Parent-Component sollte die Plant-ID direkt mit den
 * Batch-Daten liefern, da es eine 1:1 Beziehung ist.
 * 
 * Workaround: Wir erstellen minimale Plant-Objekte aus den Batch-Daten,
 * wenn die echten Plant-Daten noch nicht geladen sind.
 */
const MotherPlantTable = ({
  tabValue,
  data,
  expandedBatchId,
  onExpandBatch,
  onOpenDestroyDialog,
  onOpenCreateCuttingDialog,
  currentPage,
  totalPages,
  onPageChange,
  batchPlants,
  destroyedBatchPlants,
  plantsCurrentPage,
  plantsTotalPages,
  destroyedPlantsCurrentPage,
  destroyedPlantsTotalPages,
  onPlantsPageChange,
  onDestroyedPlantsPageChange,
  selectedPlants,
  togglePlantSelection,
  selectAllPlantsInBatch,
  // Neue Props für Stecklinge-Paginierung und -Daten
  batchCuttings,
  loadingCuttings,
  cuttingsCurrentPage,
  cuttingsTotalPages,
  onCuttingsPageChange,
  loadCuttingsForBatch,
  onOpenImageModal,
  onOpenRatingDialog // NEU
}) => {
  // Zustände für die vernichteten Pflanzen-Details
  const [destroyedPlantsDetails, setDestroyedPlantsDetails] = useState({});
  const [loadingDestroyedDetails, setLoadingDestroyedDetails] = useState({});
  
  // Funktion zum Laden der vernichteten Pflanzen-Details
  const loadDestroyedPlantsDetails = async (batchId) => {
    // Nur laden, wenn noch nicht vorhanden
    if (destroyedPlantsDetails[batchId]) return;
    
    setLoadingDestroyedDetails(prev => ({ ...prev, [batchId]: true }));
    
    try {
      // API-Aufruf für alle Pflanzen (auch vernichtete)
      const res = await api.get(`/trackandtrace/motherbatches/${batchId}/plants/`);
      
      // Vernichtete Pflanzen filtern
      const destroyedPlants = (res.data.results || []).filter(plant => plant.is_destroyed);
      
      // Speichern der vernichteten Pflanzen-Details
      setDestroyedPlantsDetails(prev => ({
        ...prev,
        [batchId]: destroyedPlants
      }));
    } catch (error) {
      console.error("Fehler beim Laden der vernichteten Pflanzen-Details:", error);
      setDestroyedPlantsDetails(prev => ({
        ...prev,
        [batchId]: []
      }));
    } finally {
      setLoadingDestroyedDetails(prev => ({ ...prev, [batchId]: false }));
    }
  };
  
  // Kombinierter useEffect für Stecklinge und vernichtete Pflanzen
  useEffect(() => {
    // Batch-ID aus dem expandierten Batch ermitteln
    const currentBatch = data.find(batch => batch.id === expandedBatchId);
    
    if (!currentBatch) return;
    
    // Wenn wir im Stecklinge-Tab sind und ein Batch expandiert ist
    if (tabValue === 1 && expandedBatchId) {
      loadCuttingsForBatch && loadCuttingsForBatch(expandedBatchId, 1);
    }
    
    // Vernichtete Pflanzen-Details laden, wenn vorhanden
    if (currentBatch.destroyed_plants_count > 0 && !destroyedPlantsDetails[expandedBatchId]) {
      loadDestroyedPlantsDetails(expandedBatchId);
    }
  }, [tabValue, expandedBatchId, data]);

  // Spalten für den Tabellenkopf definieren - mit Padding-Anpassung für erste Spalte
  const getHeaderColumns = () => {
    const baseColumns = [
      { label: '', width: '48px', align: 'center', padding: '8px' }, // Gleiche Breite wie expand icon container
      { label: 'Genetik', width: '15%', align: 'left' },
      { label: 'Pflanzen-Nummer', width: '20%', align: 'left' },
    ];

    // Tab-spezifische Spalten je nach aktivem Tab
    if (tabValue === 0 || tabValue === 2) {
      // Tab 0: Aktive Pflanzen oder Tab 2: Vernichtete Pflanzen
      return [
        ...baseColumns,
        { label: 'Status', width: '6%', align: 'center' },
        { label: 'Bewertung', width: '10%', align: 'center' },
        { label: 'Vernichtet', width: '8%', align: 'left' },
        { label: 'Kultiviert von', width: '13%', align: 'left' },
        { label: 'Raum', width: '13%', align: 'left' },
        { label: 'Erstellt am', width: '10%', align: 'left' },
        { label: 'Aktionen', width: '15%', align: 'center' }
      ];
    } else {
      // Tab 1: Stecklinge-Tab
      return [
        ...baseColumns,
        { label: 'Stecklinge', width: '8%', align: 'center' },
        { label: 'Vernichtet', width: '10%', align: 'left' },
        { label: 'Erstellt von', width: '15%', align: 'left' },
        { label: 'Raum', width: '15%', align: 'left' },
        { label: 'Erstellt am', width: '10%', align: 'left' },
        { label: 'Aktionen', width: '5%', align: 'center' }
      ];
    }
  };

  // Hilfsfunktion um die erste Pflanze aus batchPlants zu holen
  const getFirstPlant = (batch) => {
    if (batchPlants && batchPlants[batch.id] && batchPlants[batch.id].length > 0) {
      return batchPlants[batch.id][0];
    }
    return null;
  };

  // Hilfsfunktion um Batch- und Plant-Daten zu kombinieren
  const getCombinedData = (batch) => {
    const plant = getFirstPlant(batch);
    
    // WICHTIG: Die API liefert die Daten unter "average_batch_rating", nicht "mother_average_rating"!
    
    // Für die durchschnittliche Bewertung - average_batch_rating ist das richtige Feld!
    const averageRating = batch.average_batch_rating || // Das ist das richtige Feld aus der API!
                         batch.mother_average_rating || 
                         batch.average_rating || 
                         batch.plant_average_rating ||
                         batch.avg_rating ||
                         batch.rating ||
                         plant?.average_rating || 
                         null;
    
    // Für die Anzahl der Bewertungen - suche in allen möglichen Feldern
    let ratingCount = 0;
    
    // Suche nach allen Feldern die "rating" und "count" enthalten
    Object.keys(batch).forEach(key => {
      if (key.toLowerCase().includes('rating') && key.toLowerCase().includes('count')) {
        const value = batch[key];
        if (typeof value === 'number' && value > ratingCount) {
          ratingCount = value;
        }
      }
    });
    
    // Falls immer noch 0, prüfe andere Quellen
    if (ratingCount === 0) {
      ratingCount = batch.average_batch_rating_count || 
                   batch.mother_rating_count || 
                   batch.rating_count || 
                   batch.plant_rating_count ||
                   batch.ratings_count ||
                   batch.total_ratings ||
                   (batch.average_batch_rating ? 1 : 0) || // Wenn Rating vorhanden, mindestens 1
                   plant?.rating_count || 
                   0;
    }
    
    // Für Premium-Status - premium_plants_count zeigt an, ob Premium vorhanden
    const isPremium = batch.premium_plants_count > 0 || // Das ist das richtige Feld!
                     batch.is_premium_mother || 
                     batch.is_premium || 
                     batch.has_premium_mother ||
                     batch.premium_mother ||
                     plant?.is_premium_mother || 
                     false;
    
    // Plant-ID - da es nur eine Pflanze pro Batch gibt, könnte die ID direkt im Batch sein
    // Prüfe verschiedene mögliche Feldnamen
    const plantId = batch.plant_id || 
                   batch.mother_plant_id || 
                   batch.single_plant_id ||
                   batch.first_plant_id ||
                   batch.plants?.[0]?.id || // Falls plants Array direkt mitgeliefert wird
                   plant?.id || 
                   null;
    
    return {
      ...batch,
      rating_count: ratingCount,
      average_rating: averageRating,
      is_premium: isPremium,
      image_count: batch.image_count || 0,
      plant_id: plantId
    };
  };

  // Funktion zum Erstellen der Spalten für eine Zeile
  const getRowColumns = (batch) => {
    // Hole die kombinierten Daten
    const combinedData = getCombinedData(batch);
    const plant = getFirstPlant(batch);
    
    // Debug Info nur einmal loggen
    if (process.env.NODE_ENV === 'development' && !window._debugLogShown) {
      window._debugLogShown = true;
      console.log('MotherPlantTable Debug Info:');
      console.log('- Total batches:', data.length);
      console.log('- Batches with ratings:', data.filter(b => b.average_batch_rating).length);
      console.log('- Loaded plants:', Object.keys(batchPlants).length);
      
      // Suche nach Plant-ID Feldern im ersten Batch
      if (data[0]) {
        const plantIdFields = Object.keys(data[0]).filter(key => 
          key.toLowerCase().includes('plant') && 
          (key.toLowerCase().includes('id') || key === 'plants')
        );
        console.log('- Potential plant ID fields in batch:', plantIdFields);
        plantIdFields.forEach(field => {
          console.log(`  - ${field}:`, data[0][field]);
        });
      }
    }
    
    // Basis-Spalten für alle Tabs
    const baseColumns = [
      {
        content: '', // Platz für Expand-Icon
        width: '3%'
      },
      {
        content: (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ScienceIcon sx={{ color: 'primary.main', fontSize: '0.9rem', mr: 0.8 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'bold',
                fontSize: '0.8rem',
                color: 'inherit',
                lineHeight: 1.4,
                // Überschreibe die Ellipsis-Einstellungen
                whiteSpace: 'normal',
                overflow: 'visible',
                textOverflow: 'unset'
              }}
            >
              {batch.seed_strain || batch.mother_strain}
            </Typography>
          </Box>
        ),
        width: '15%'
      },
      {
        content: batch.batch_number || '',
        width: '17%', // Angepasst
        fontFamily: 'monospace',
        fontSize: '0.85rem'
      }
    ];

    if (tabValue === 0 || tabValue === 2) {
      // Für Tabs 0: Aktive und 2: Vernichtete Pflanzen
      return [
        ...baseColumns,
        {
          // Status-Icon
          content: batch.active_plants_count > 0 
            ? <CheckCircleIcon sx={{ color: 'success.main' }} />
            : <CancelIcon sx={{ color: 'error.main' }} />,
          width: '6%',
          align: 'center'
        },
        {
          // Bewertungs-Spalte
          content: plant ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              {plant.average_rating && (
                <Typography variant="body2" sx={{ color: 'warning.main' }}>
                  ⭐ {plant.average_rating}
                </Typography>
              )}
              
              {plant.is_premium_mother && (
                <Tooltip title="Premium Mutterpflanze">
                  <Typography variant="caption" sx={{ 
                    backgroundColor: 'warning.light',
                    color: 'warning.dark',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 'bold'
                  }}>
                    PREMIUM
                  </Typography>
                </Tooltip>
              )}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>
          ),
          width: '10%',
          align: 'center'
        },
        {
          // Vernichtete Pflanzen Anzahl
          content: `${batch.destroyed_plants_count}`,
          width: '8%',
          color: batch.destroyed_plants_count > 0 ? 'error.main' : 'text.primary'
        },
        {
          content: batch.member ? 
            (batch.member.display_name || `${batch.member.first_name} ${batch.member.last_name}`) 
            : "Nicht zugewiesen",
          width: '13%'
        },
        {
          content: batch.room ? batch.room.name : "Nicht zugewiesen",
          width: '13%'
        },
        {
          content: new Date(batch.created_at).toLocaleDateString('de-DE'),
          width: '10%'
        },
        {
          // Erweiterte Aktionen-Spalte
          content: (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
              {/* Bewertungs-Button - nur anzeigen wenn wir im aktiven Tab sind */}
              {tabValue === 0 && (
                <Box
                  sx={{
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    borderRadius: '4px',
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      borderColor: 'rgba(0, 0, 0, 0.23)'
                    }
                  }}
                >
                  <Tooltip title={`Pflanze bewerten (${combinedData.rating_count} Bewertungen)`}>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        p: 0.5,
                        color: combinedData.is_premium ? 'warning.main' : 'rgba(0, 0, 0, 0.54)',
                        '& .MuiBadge-root': {
                          '& .MuiBadge-badge': {
                            fontSize: '0.7rem',
                            minWidth: '18px',
                            height: '18px',
                            padding: '0 4px'
                          }
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Prüfe ob wir eine Plant-ID direkt aus dem Batch extrahieren können
                        const plantId = combinedData.plant_id || batch.id + '_plant';
                        
                        // Da es nur noch eine Pflanze pro Batch gibt, können wir
                        // ein minimales Plant-Objekt erstellen, falls nötig
                        const plantData = plant || {
                          id: plantId,
                          batch_id: batch.id,
                          batch_number: batch.batch_number,
                          rating_count: combinedData.rating_count,
                          average_rating: combinedData.average_rating,
                          is_premium_mother: combinedData.is_premium,
                          is_destroyed: false
                        };
                        
                        console.log('Opening rating dialog:', {
                          batch_id: batch.id,
                          plant_id: plantData.id,
                          has_real_plant: !!plant,
                          combined_plant_id: combinedData.plant_id
                        });
                        
                        // Öffne den Dialog direkt mit den verfügbaren Daten
                        onOpenRatingDialog(batch, plantData);
                      }}
                    >
                      <Badge 
                        badgeContent={combinedData.rating_count} 
                        color="primary" 
                        max={99} 
                        showZero
                      >
                        <StarIcon sx={{ fontSize: '1rem' }} />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              
              {/* Stecklinge erstellen Button */}
              {tabValue === 0 && (
                <Box
                  sx={{
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    borderRadius: '4px',
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      borderColor: 'rgba(0, 0, 0, 0.23)'
                    }
                  }}
                >
                  <Tooltip title="Stecklinge erstellen">
                    <IconButton 
                      size="small" 
                      sx={{ 
                        p: 0.5,
                        color: 'rgba(0, 0, 0, 0.54)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Erstelle minimale Plant-Daten falls nötig
                        const plantData = plant || {
                          id: batch.id + '_plant',
                          batch_id: batch.id,
                          batch_number: batch.batch_number,
                          is_destroyed: false
                        };
                        
                        onOpenCreateCuttingDialog(batch, plantData);
                      }}
                    >
                      <ContentCutIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              
              {/* Vernichten Button */}
              {tabValue === 0 && (
                <Box
                  sx={{
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    borderRadius: '4px',
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 0, 0, 0.04)',
                      borderColor: 'error.main'
                    }
                  }}
                >
                  <Tooltip title="Pflanze vernichten">
                    <IconButton 
                      size="small" 
                      sx={{ 
                        p: 0.5,
                        color: 'rgba(0, 0, 0, 0.54)',
                        '&:hover': {
                          color: 'error.main'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Da es nur eine Pflanze pro Batch gibt, 
                        // kann der Dialog möglicherweise auch ohne spezifische Plant-ID funktionieren
                        if (plant) {
                          togglePlantSelection(batch.id, plant.id);
                        }
                        
                        // Öffne den Dialog mit Batch-Daten
                        onOpenDestroyDialog(batch);
                      }}
                    >
                      <LocalFireDepartmentIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              
              {/* Bilder verwalten */}
              <Box
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '4px',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderColor: 'rgba(0, 0, 0, 0.23)'
                  }
                }}
              >
                <Tooltip title={`Bilder verwalten (${combinedData.image_count})`}>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenImageModal(batch, e)
                    }}
                    sx={{ 
                      p: 0.5,
                      color: 'rgba(0, 0, 0, 0.54)',
                      '& .MuiBadge-root': {
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          minWidth: '18px',
                          height: '18px',
                          padding: '0 4px'
                        }
                      }
                    }}
                  >
                    <Badge badgeContent={combinedData.image_count} color="primary" showZero>
                      <PhotoCameraIcon sx={{ fontSize: '1rem' }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ),
          width: '13%',
          align: 'center',
          stopPropagation: true
        }
      ];
    } else {
      // Für Tab 1: Stecklinge
      return [
        ...baseColumns,
        {
          content: `${batch.active_cuttings_count}/${batch.quantity}`,
          width: '8%',
          align: 'center'
        },
        {
          content: `${batch.destroyed_cuttings_count}`,
          width: '10%',
          color: batch.destroyed_cuttings_count > 0 ? 'error.main' : 'text.primary'
        },
        {
          content: batch.member ? 
            (batch.member.display_name || `${batch.member.first_name} ${batch.member.last_name}`) 
            : "Nicht zugewiesen",
          width: '15%'
        },
        {
          content: batch.room ? batch.room.name : "Nicht zugewiesen",
          width: '15%'
        },
        {
          content: new Date(batch.created_at).toLocaleDateString('de-DE'),
          width: '10%'
        },
        {
          content: (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Box
                sx={{
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '4px',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderColor: 'rgba(0, 0, 0, 0.23)'
                  }
                }}
              >
                <Tooltip title={`Bilder verwalten (${batch.image_count || 0})`}>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenImageModal(batch, e)
                    }}
                    sx={{ 
                      p: 0.5,
                      color: 'rgba(0, 0, 0, 0.54)',
                      '& .MuiBadge-root': {
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          minWidth: '18px',
                          height: '18px',
                          padding: '0 4px'
                        }
                      }
                    }}
                  >
                    <Badge badgeContent={batch.image_count || 0} color="primary" showZero>
                      <PhotoCameraIcon sx={{ fontSize: '1rem' }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ),
          width: '5%',
          align: 'center',
          stopPropagation: true
        }
      ];
    }
  };

  // Funktion für Activity-Stream-Nachrichten
  const getActivityMessage = (batch) => {
    const cultivator = batch.member 
      ? (batch.member.display_name || `${batch.member.first_name} ${batch.member.last_name}`) 
      : "Unbekannt";
    const roomName = batch.room ? batch.room.name : "unbekanntem Raum";
    const date = new Date(batch.created_at).toLocaleDateString('de-DE');
    
    if (tabValue === 0 || tabValue === 2) {
      // Mutterpflanzen Nachricht
      return `Mutterpflanze ${batch.batch_number} mit Genetik ${batch.seed_strain} wurde von ${cultivator} am ${date} im Raum ${roomName} angelegt.`;
    } else {
      // Stecklinge Nachricht
      return `${batch.quantity} Stecklinge wurden von ${cultivator} am ${date} im Raum ${roomName} von Mutterpflanze ${batch.mother_batch_number || "Unbekannt"} erstellt.`;
    }
  };

  // Detailansicht für einen Batch rendern
  const renderBatchDetails = (batch) => {
    const plant = getFirstPlant(batch);
    
    // Details-Card-Inhalte anpassen
    const chargeDetails = (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.6)' }}>
            Pflanzen-Nummer:
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>
            {batch.batch_number}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.6)' }}>
            UUID:
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(0, 0, 0, 0.87)',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              wordBreak: 'break-all'
            }}
          >
            {batch.id}
          </Typography>
        </Box>
        {plant && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.6)' }}>
              Pflanzen-UUID:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(0, 0, 0, 0.87)',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all'
              }}
            >
              {plant.id}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.6)' }}>
            Erstellt am:
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>
            {new Date(batch.created_at).toLocaleDateString('de-DE')}
          </Typography>
        </Box>
        {tabValue === 0 || tabValue === 2 ? (
          // Für Mutterpflanzen-Tab (0 und 2)
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.6)' }}>
              Ursprungssamen:
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>
              {batch.seed_batch_number || "Unbekannt"}
            </Typography>
          </Box>
        ) : (
          // Für Stecklinge-Tab (1)
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.6)' }}>
                Ursprungs-Mutterpflanzen-Charge:
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>
                {batch.mother_batch_number || "Unbekannt"}
              </Typography>
            </Box>
            {batch.mother_plant_number && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.6)' }}>
                  Spezifische Mutterpflanze:
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.87)' }}>
                  {batch.mother_plant_number}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    );

    // Infos für Pflanzen-IDs oder Stecklinge-Infos
    const idsContent = tabValue === 0 || tabValue === 2
      ? (
        // Vereinfachte Status-Anzeige für Mutterpflanzen
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'rgba(0, 0, 0, 0.87)' }}>
            Pflanzenstatus
          </Typography>
          <Box
            sx={{
              backgroundColor: 'white',
              p: 1.5,
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              mb: 2,
              border: '1px solid rgba(0, 0, 0, 0.12)'
            }}
          >
            {batch.active_plants_count > 0 ? (
              <Typography variant="body2" sx={{ color: 'primary.main' }}>
                ✓ Aktive Mutterpflanze
              </Typography>
            ) : batch.destroyed_plants_count > 0 ? (
              <Typography variant="body2" sx={{ color: 'error.main' }}>
                ✗ Mutterpflanze wurde vernichtet
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                Status unbekannt
              </Typography>
            )}
          </Box>
          
          {batch.converted_to_cuttings_count > 0 && (
            <>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'rgba(0, 0, 0, 0.87)' }}>
                Stecklinge
              </Typography>
              <Box
                sx={{
                  backgroundColor: 'white',
                  p: 1.5,
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }}
              >
                <Typography variant="body2" sx={{ color: 'primary.main' }}>
                  {batch.converted_to_cuttings_count} Stecklinge wurden von dieser Mutterpflanze erstellt
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )
      : (
        // Stecklinge-Info für Stecklinge-Tab (1)
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'rgba(0, 0, 0, 0.87)' }}>
            Aktive Stecklinge:
          </Typography>
          <Box
            sx={{
              backgroundColor: 'white',
              p: 1.5,
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              wordBreak: 'break-all',
              mb: 2,
              border: '1px solid rgba(0, 0, 0, 0.12)'
            }}
          >
            {batch.active_cuttings_count > 0 
              ? `${batch.active_cuttings_count} aktive Stecklinge` 
              : "Keine aktiven Stecklinge"}
          </Box>
          
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'rgba(0, 0, 0, 0.87)' }}>
            Vernichtete Stecklinge:
          </Typography>
          <Box
            sx={{
              backgroundColor: 'white',
              p: 1.5,
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              wordBreak: 'break-all',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              color: batch.destroyed_cuttings_count > 0 ? 'error.main' : 'rgba(0, 0, 0, 0.38)'
            }}
          >
            {batch.destroyed_cuttings_count > 0 
              ? `${batch.destroyed_cuttings_count} Stecklinge vernichtet` 
              : "Keine vernichteten Stecklinge"}
          </Box>
        </Box>
      );

    const notesContent = (
      <Box
        sx={{
          backgroundColor: 'white',
          p: 2,
          borderRadius: '4px',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          flexGrow: 1,
          display: 'flex',
          alignItems: batch.notes ? 'flex-start' : 'center',
          justifyContent: batch.notes ? 'flex-start' : 'center',
          width: '100%'
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            fontStyle: batch.notes ? 'normal' : 'italic',
            color: batch.notes ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, 0.6)',
            width: '100%'
          }}
        >
          {batch.notes || 'Keine Notizen für diese Charge vorhanden'}
        </Typography>
      </Box>
    );

    const cards = [
      {
        title: tabValue === 1 ? 'Stecklinge-Details' : 'Pflanzen-Details',
        content: chargeDetails
      },
      {
        title: tabValue === 1 ? 'Stecklinge-Info' : 'Status',
        content: idsContent
      },
      {
        title: 'Notizen',
        content: notesContent
      }
    ];
    
    // Funktion zum Rendern der Stecklinge-Liste
    const renderCuttingsDetails = () => {
      // Nur für Tab 1 (Konvertiert zu Stecklingen)
      if (tabValue !== 1) return null;

      const isLoading = loadingCuttings?.[batch.id] || false;
      const cuttings = batchCuttings?.[batch.id] || [];
      const currentPage = cuttingsCurrentPage?.[batch.id] || 1;
      const totalPages = cuttingsTotalPages?.[batch.id] || 1;

      return (
        <Box sx={{ width: '100%', mt: 3 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Stecklinge in dieser Charge
          </Typography>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <LoadingIndicator size={24} />
            </Box>
          ) : (
            <>
              {cuttings.length > 0 ? (
                <>
                  <TableContainer component={Paper} elevation={1} sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'primary.main' }}>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Steckling-ID</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>UUID</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Erstellt am</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Notizen</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cuttings.map((cutting, i) => (
                          <TableRow 
                            key={cutting.id || i}
                            sx={{ 
                              backgroundColor: 'white',
                              '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' }
                            }}
                          >
                            <TableCell>{cutting.batch_number}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {cutting.id || '-'}
                            </TableCell>
                            <TableCell>
                              {cutting.is_destroyed 
                                ? <Typography color="error">Vernichtet</Typography> 
                                : <Typography color="success.main">Aktiv</Typography>}
                            </TableCell>
                            <TableCell>
                              {cutting.created_at ? new Date(cutting.created_at).toLocaleString('de-DE') : '-'}
                            </TableCell>
                            <TableCell>{cutting.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Paginierung für Stecklinge innerhalb eines Batches */}
                  {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" mt={2} width="100%">
                      <Pagination 
                        count={totalPages}
                        page={currentPage}
                        onChange={(e, page) => onCuttingsPageChange(batch.id, e, page)}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  Keine Stecklinge in dieser Charge vorhanden.
                </Typography>
              )}
            </>
          )}
        </Box>
      );
    };

    return (
      <>
        {/* Activity Stream Message */}
        <Box 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: 'white', 
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'rgba(0, 0, 0, 0.6)' }}>
            {getActivityMessage(batch)}
          </Typography>
        </Box>
        
        <DetailCards cards={cards} color="primary.main" />
        
        {/* Stecklinge-Details nur im Stecklinge-Tab anzeigen */}
        {tabValue === 1 && renderCuttingsDetails()}

        {/* Tab 2: Vernichtete Pflanzen */}
        {tabValue === 2 && (
          <>
            {destroyedBatchPlants[batch.id] ? (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Vernichtete Pflanzen
                </Typography>
                
                {destroyedBatchPlants[batch.id]?.length > 0 ? (
                  <>
                    <TableContainer component={Paper} elevation={1} sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'error.main' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Charge-Nummer</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>UUID</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vernichtet am</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vernichtet durch</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Grund</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {destroyedBatchPlants[batch.id]?.map((plant, i) => (
                            <TableRow 
                              key={plant.id}
                              sx={{ 
                                backgroundColor: 'white',
                                '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' }
                              }}
                            >
                              <TableCell>
                                {plant.batch_number || `Pflanze ${i+1} (Nummer nicht verfügbar)`}
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {plant.id}
                              </TableCell>
                              <TableCell>
                                {plant.destroyed_at ? new Date(plant.destroyed_at).toLocaleString('de-DE') : '-'}
                              </TableCell>
                              <TableCell>
                                {plant.destroyed_by ? 
                                  (plant.destroyed_by.display_name || `${plant.destroyed_by.first_name || ''} ${plant.destroyed_by.last_name || ''}`.trim()) 
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {plant.destroy_reason || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* Pagination für die vernichteten Pflanzen */}
                    {destroyedPlantsTotalPages[batch.id] > 1 && (
                      <Box display="flex" justifyContent="center" mt={2} width="100%">
                        <Pagination 
                          count={destroyedPlantsTotalPages[batch.id]} 
                          page={destroyedPlantsCurrentPage[batch.id] || 1} 
                          onChange={(e, page) => onDestroyedPlantsPageChange(batch.id, e, page)}
                          color="error"
                          size="small"
                        />
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    Keine vernichteten Pflanzen in dieser Charge.
                  </Typography>
                )}
              </Box>
            ) : (
              <LoadingIndicator size={24} />
            )}
          </>
        )}
      </>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TableHeader columns={getHeaderColumns()} />
  
      {data && data.length > 0 ? (
        data.map((batch) => (
          <AccordionRow
            key={batch.id}
            isExpanded={expandedBatchId === batch.id}
            onClick={() => onExpandBatch(batch.id)}
            columns={getRowColumns(batch)}
            borderColor="primary.main"
            expandIconPosition="start"
          >
            {renderBatchDetails(batch)}
          </AccordionRow>
        ))
      ) : (
        <Typography align="center" sx={{ mt: 4, width: '100%' }}>
          {tabValue === 1 ? 'Keine Stecklinge vorhanden' : 'Keine Mutterpflanzen vorhanden'}
        </Typography>
      )}
  
      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        hasData={data && data.length > 0}
        emptyMessage=""
        color="primary"
      />
    </Box>
  );
};

export default MotherPlantTable;