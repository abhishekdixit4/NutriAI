"""
Fine-tune ResNet-50 on Food-101.
Demo training script for paper-aligned reproducibility.
"""

import torch
from torchvision import datasets, models, transforms
from torch import nn, optim
from torch.utils.data import DataLoader


def get_loaders(data_root: str, batch_size: int = 32):
  train_tfms = transforms.Compose(
      [
          transforms.Resize(256),
          transforms.RandomResizedCrop(224),
          transforms.RandomHorizontalFlip(),
          transforms.ToTensor(),
          transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
      ]
  )
  test_tfms = transforms.Compose(
      [
          transforms.Resize(256),
          transforms.CenterCrop(224),
          transforms.ToTensor(),
          transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
      ]
  )

  train_ds = datasets.Food101(root=data_root, split="train", transform=train_tfms, download=True)
  test_ds = datasets.Food101(root=data_root, split="test", transform=test_tfms, download=True)
  return (
      DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=2),
      DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=2),
      len(train_ds.classes),
  )


def main():
  device = "cuda" if torch.cuda.is_available() else "cpu"
  train_loader, test_loader, num_classes = get_loaders("./data")

  model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
  model.fc = nn.Linear(model.fc.in_features, num_classes)
  model = model.to(device)

  criterion = nn.CrossEntropyLoss()
  optimizer = optim.AdamW(model.parameters(), lr=2e-4, weight_decay=1e-4)

  for epoch in range(3):
    model.train()
    running_loss = 0.0
    for images, labels in train_loader:
      images, labels = images.to(device), labels.to(device)
      optimizer.zero_grad()
      outputs = model(images)
      loss = criterion(outputs, labels)
      loss.backward()
      optimizer.step()
      running_loss += loss.item()
    print(f"epoch={epoch+1} train_loss={running_loss / max(1, len(train_loader)):.4f}")

  model.eval()
  correct, total = 0, 0
  with torch.no_grad():
    for images, labels in test_loader:
      images, labels = images.to(device), labels.to(device)
      outputs = model(images)
      preds = outputs.argmax(dim=1)
      correct += (preds == labels).sum().item()
      total += labels.size(0)
  print(f"test_top1={(100 * correct / max(1, total)):.2f}%")

  torch.save(model.state_dict(), "resnet50_food101.pt")
  print("saved resnet50_food101.pt")


if __name__ == "__main__":
  main()

