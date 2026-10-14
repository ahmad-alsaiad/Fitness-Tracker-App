import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Trash2, SplitSquareHorizontal, Layers, Edit2, Check, Image as ImageIcon } from 'lucide-react';
import { db } from '../../db/db';
import type { PhysiquePhoto, PhotoPose } from '../../types';
import { useConfirm } from '../common/useConfirm';
import { Sheet } from '../common/Sheet';

interface PhotosViewProps {
  selectedDate: string;
}

export const PhotosView: React.FC<PhotosViewProps> = ({ selectedDate }) => {
  const [photos, setPhotos] = useState<PhysiquePhoto[]>([]);
  const [activeTab, setActiveTab] = useState<'vault' | 'compare'>('vault');
  const [selectedPose, setSelectedPose] = useState<PhotoPose>('front');
  const [filterPose, setFilterPose] = useState<PhotoPose | 'all'>('all');

  // Editing a photo's pose
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);

  // Direct Photo Comparison State
  const [selectedPhotoIdA, setSelectedPhotoIdA] = useState<number | null>(null);
  const [selectedPhotoIdB, setSelectedPhotoIdB] = useState<number | null>(null);
  const [isPickingPhotoFor, setIsPickingPhotoFor] = useState<'before' | 'after' | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side'>('slider');

  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const [confirm, confirmDialog] = useConfirm();

  const loadPhotos = async () => {
    const list = await db.physiquePhotos.orderBy('date').reverse().toArray();
    setPhotos(list);

    if (list.length >= 2) {
      setSelectedPhotoIdA((prev) => (prev !== null && list.some((p) => p.id === prev) ? prev : list[list.length - 1].id || null));
      setSelectedPhotoIdB((prev) => (prev !== null && list.some((p) => p.id === prev) ? prev : list[0].id || null));
    } else if (list.length === 1) {
      setSelectedPhotoIdA((prev) => (prev !== null && list.some((p) => p.id === prev) ? prev : list[0].id || null));
      setSelectedPhotoIdB((prev) => (prev !== null && list.some((p) => p.id === prev) ? prev : list[0].id || null));
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await db.physiquePhotos.add({
        date: selectedDate,
        pose: selectedPose,
        photoDataUrl: dataUrl,
        createdAt: new Date().toISOString(),
      });
      loadPhotos();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Fixed delete function using in-app confirmation
  const handleDeletePhoto = async (id?: number) => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this physique photo?',
      message: 'This photo will be permanently deleted from your local storage.',
      confirmLabel: 'Delete Photo',
    });
    if (ok) {
      await db.physiquePhotos.delete(id);
      loadPhotos();
    }
  };

  // Edit photo pose status (front, back, side)
  const handleChangePose = async (photoId: number, newPose: PhotoPose) => {
    await db.physiquePhotos.update(photoId, { pose: newPose });
    setEditingPhotoId(null);
    loadPhotos();
  };

  // Drag handlers for split slider
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current && e.type !== 'touchmove') return;
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((offsetX / rect.width) * 100);
    setSliderPos(percentage);
  };

  const filteredPhotos = photos.filter((p) =>
    filterPose === 'all' ? true : p.pose === filterPose
  );

  const photoA = photos.find((p) => p.id === selectedPhotoIdA) || (photos.length > 1 ? photos[photos.length - 1] : photos[0]);
  const photoB = photos.find((p) => p.id === selectedPhotoIdB) || photos[0];

  return (
    <div className="space-y-4 pb-20">
      {confirmDialog}

      {/* Top Header & Mode Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-textPrimary flex items-center space-x-2">
          <Camera className="w-5 h-5 text-primary" />
          <span>Physique Photo Vault</span>
        </h2>

        <div className="flex bg-surface border border-border-subtle rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'vault' ? 'bg-primary text-canvas' : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            Vault
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'compare' ? 'bg-primary text-canvas' : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            Compare
          </button>
        </div>
      </div>

      {activeTab === 'vault' ? (
        /* VAULT GALLERY MODE */
        <div className="space-y-4">
          {/* Upload Card for Selected Date */}
          <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-textPrimary">Log Physique Photo</h3>
                <p className="text-[11px] text-textMuted">Date: {selectedDate} • Private in IndexedDB</p>
              </div>

              {/* Pose selector */}
              <div className="flex bg-canvas border border-border-subtle rounded-xl p-1">
                {(['front', 'back', 'side'] as const).map((pose) => (
                  <button
                    key={pose}
                    type="button"
                    onClick={() => setSelectedPose(pose)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      selectedPose === pose ? 'bg-primary text-canvas' : 'text-textMuted'
                    }`}
                  >
                    {pose}
                  </button>
                ))}
              </div>
            </div>

            <label className="w-full py-4 rounded-xl border-2 border-dashed border-border-subtle bg-canvas/60 hover:bg-canvas hover:border-primary/50 transition-all flex flex-col items-center justify-center cursor-pointer space-y-1 text-center">
              <Upload className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-textPrimary">
                Upload {selectedPose.toUpperCase()} Photo
              </span>
              <span className="text-[10px] text-textMuted">Tap to take photo or choose from library</span>
              <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
            </label>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
              Gallery ({filteredPhotos.length})
            </span>
            <div className="flex space-x-1">
              {(['all', 'front', 'back', 'side'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterPose(p)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
                    filterPose === p
                      ? 'bg-primary text-canvas'
                      : 'bg-surface text-textMuted border border-border-subtle hover:text-textPrimary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="bg-surface rounded-2xl p-10 border border-border-subtle text-center text-textMuted text-xs space-y-2">
              <Camera className="w-8 h-8 mx-auto opacity-40 text-primary" />
              <p>No photos uploaded yet.</p>
              <p className="text-[11px] text-textMuted/70">
                Snap weekly check-in photos to track physical transformation over time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-2xl overflow-hidden bg-surface border border-border-subtle aspect-[3/4] shadow-sm flex flex-col justify-end"
                >
                  <img
                    src={photo.photoDataUrl}
                    alt={`${photo.pose} photo from ${photo.date}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Gradient Overlay & Controls */}
                  <div className="relative z-10 p-2.5 bg-gradient-to-t from-canvas/95 via-canvas/60 to-transparent flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-textPrimary text-xs block leading-tight">
                        {photo.date}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPhotoId(editingPhotoId === photo.id ? null : photo.id!)
                          }
                          className="p-1 rounded-lg bg-canvas/80 text-textMuted hover:text-primary hover:bg-canvas transition-colors"
                          title="Change pose status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="p-1 rounded-lg bg-canvas/80 text-textMuted hover:text-danger hover:bg-canvas transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Pose status / editor */}
                    {editingPhotoId === photo.id ? (
                      <div className="flex gap-1 bg-canvas p-1 rounded-lg border border-primary/40 animate-fade-in">
                        {(['front', 'back', 'side'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleChangePose(photo.id!, p)}
                            className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              photo.pose === p ? 'bg-primary text-canvas' : 'text-textMuted hover:text-textPrimary'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                        {photo.pose} pose
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DIRECT PHOTO COMPARISON (SLIDER & SIDE-BY-SIDE) */
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-textPrimary flex items-center space-x-1.5">
                  <SplitSquareHorizontal className="w-4 h-4 text-primary" />
                  <span>Choose Photos to Compare</span>
                </h3>
                <p className="text-[11px] text-textMuted">Pick any two photos from your vault</p>
              </div>

              <div className="flex bg-canvas border border-border-subtle rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setComparisonMode('slider')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    comparisonMode === 'slider' ? 'bg-primary text-canvas' : 'text-textMuted'
                  }`}
                >
                  Slider
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('side-by-side')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    comparisonMode === 'side-by-side' ? 'bg-primary text-canvas' : 'text-textMuted'
                  }`}
                >
                  Side by Side
                </button>
              </div>
            </div>

            {/* Before & After Photo Selectors */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Photo A (Before) */}
              <button
                type="button"
                onClick={() => setIsPickingPhotoFor('before')}
                className="p-2.5 rounded-xl bg-canvas border border-border-subtle hover:border-primary/50 text-left transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Before Photo</span>
                  <span className="text-[10px] text-primary font-semibold group-hover:underline">Change</span>
                </div>
                {photoA ? (
                  <div className="flex items-center space-x-2">
                    <img
                      src={photoA.photoDataUrl}
                      alt="Before thumbnail"
                      className="w-12 h-14 object-cover rounded-lg border border-border-subtle flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-textPrimary block truncate">{photoA.date}</span>
                      <span className="text-[10px] text-primary uppercase font-bold">{photoA.pose}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-14 rounded-lg border border-dashed border-border-subtle flex items-center justify-center text-xs text-textMuted">
                    Tap to Choose
                  </div>
                )}
              </button>

              {/* Photo B (After) */}
              <button
                type="button"
                onClick={() => setIsPickingPhotoFor('after')}
                className="p-2.5 rounded-xl bg-canvas border border-border-subtle hover:border-primary/50 text-left transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">After Photo</span>
                  <span className="text-[10px] text-primary font-semibold group-hover:underline">Change</span>
                </div>
                {photoB ? (
                  <div className="flex items-center space-x-2">
                    <img
                      src={photoB.photoDataUrl}
                      alt="After thumbnail"
                      className="w-12 h-14 object-cover rounded-lg border border-border-subtle flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-textPrimary block truncate">{photoB.date}</span>
                      <span className="text-[10px] text-primary uppercase font-bold">{photoB.pose}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-14 rounded-lg border border-dashed border-border-subtle flex items-center justify-center text-xs text-textMuted">
                    Tap to Choose
                  </div>
                )}
              </button>
            </div>
          </div>

          {!photoA || !photoB ? (
            <div className="bg-surface rounded-2xl p-8 border border-border-subtle text-center text-xs text-textMuted space-y-2">
              <Layers className="w-8 h-8 mx-auto text-primary opacity-50" />
              <p>Please select two photos to compare.</p>
              <p className="text-[11px] text-textMuted/70">
                You can choose any two photos from your vault to see your transformation.
              </p>
            </div>
          ) : comparisonMode === 'slider' ? (
            <div className="space-y-2">
              <div
                ref={sliderRef}
                onMouseDown={() => (isDragging.current = true)}
                onMouseUp={() => (isDragging.current = false)}
                onMouseLeave={() => (isDragging.current = false)}
                onMouseMove={handleTouchMove}
                onTouchMove={handleTouchMove}
                className="relative rounded-2xl overflow-hidden bg-canvas border border-border-subtle aspect-[3/4] select-none touch-none cursor-ew-resize shadow-lg"
              >
                <img
                  src={photoB.photoDataUrl}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={photoA.photoDataUrl}
                    alt="Before"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: sliderRef.current?.clientWidth || '100%' }}
                  />
                </div>

                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-glow-primary pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-canvas flex items-center justify-center shadow-lg font-bold text-[10px]">
                    ↔
                  </div>
                </div>

                <span className="absolute top-3 left-3 px-2 py-1 rounded-md bg-canvas/80 text-[10px] font-bold text-textPrimary backdrop-blur-sm border border-border-subtle">
                  BEFORE: {photoA.date} ({photoA.pose})
                </span>
                <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-canvas/80 text-[10px] font-bold text-primary backdrop-blur-sm border border-border-subtle">
                  AFTER: {photoB.date} ({photoB.pose})
                </span>
              </div>

              <p className="text-[11px] text-center text-textMuted">
                Drag slider left/right to reveal physique progression
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl overflow-hidden bg-surface border border-border-subtle aspect-[3/4] relative">
                <img src={photoA.photoDataUrl} alt="Before" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-canvas/90 text-[10px] font-bold text-textPrimary">
                  {photoA.date} • {photoA.pose}
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden bg-surface border border-border-subtle aspect-[3/4] relative">
                <img src={photoB.photoDataUrl} alt="After" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-canvas/90 text-[10px] font-bold text-primary">
                  {photoB.date} • {photoB.pose}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct Photo Selection Sheet */}
      <Sheet
        isOpen={isPickingPhotoFor !== null}
        onClose={() => setIsPickingPhotoFor(null)}
        title={isPickingPhotoFor === 'before' ? 'Choose Before Photo' : 'Choose After Photo'}
        subtitle="Tap any photo from your vault to compare"
        icon={<ImageIcon className="w-5 h-5" />}
      >
        <div className="p-4">
          {photos.length === 0 ? (
            <p className="text-xs text-textMuted text-center py-8">No photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
              {photos.map((photo) => {
                const isSelected =
                  isPickingPhotoFor === 'before'
                    ? photo.id === photoA?.id
                    : photo.id === photoB?.id;

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => {
                      if (isPickingPhotoFor === 'before') {
                        setSelectedPhotoIdA(photo.id!);
                      } else {
                        setSelectedPhotoIdB(photo.id!);
                      }
                      setIsPickingPhotoFor(null);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-[3/4] border-2 transition-all ${
                      isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border-subtle hover:border-textMuted'
                    }`}
                  >
                    <img src={photo.photoDataUrl} alt={photo.date} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-canvas/90 to-transparent p-1.5 text-left">
                      <span className="text-[10px] font-bold text-textPrimary block leading-none">{photo.date}</span>
                      <span className="text-[9px] font-bold text-primary uppercase">{photo.pose}</span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-canvas flex items-center justify-center shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
};
